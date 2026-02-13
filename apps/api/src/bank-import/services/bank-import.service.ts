import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { createHash } from 'crypto';
import * as XLSX from 'xlsx';
import { BankImport } from '../entities/bank-import.entity';
import { SkippedTransaction } from '../entities/skipped-transaction.entity';
import { Transaction } from '@/transaction/entities/transaction.entity';
import { BankAccount } from '@/bank-account/entities/bank-account.entity';
import { BankOfGeorgiaParser } from '../parsers/bank-of-georgia.parser';
import { BankOfGeorgiaSavingsParser } from '../parsers/bank-of-georgia-savings.parser';
import { BankOfGeorgiaBusinessParser } from '../parsers/bank-of-georgia-business.parser';
import { DepositService } from '@/deposit/services/deposit.service';
import { LoanService } from '@/loan/services/loan.service';
import { ExchangeRateService } from '@/exchange-rate/services/exchange-rate.service';
import { ExchangeRate } from '@/exchange-rate/entities/exchange-rate.entity';
import { BankStatementParser, ImportResult, SkippedDetail } from '../types/parser.types';
import { TransactionType, AccountType, Currency, ExchangeRateSource } from '@budget/schemas';

@Injectable()
export class BankImportService {
  private readonly logger = new Logger(BankImportService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly depositService: DepositService,
    private readonly loanService: LoanService,
    private readonly exchangeRateService: ExchangeRateService,
  ) {}

  async processFile(
    file: Buffer,
    userId: string,
    bankAccountId?: string,
    fileName?: string,
  ): Promise<ImportResult> {
    // Parse workbook
    const workbook = XLSX.read(file, { type: 'buffer' });

    // Try all registered parsers; first match wins
    const parsers: BankStatementParser[] = [
      new BankOfGeorgiaParser(),
      new BankOfGeorgiaSavingsParser(),
      new BankOfGeorgiaBusinessParser(),
    ];
    const parser = parsers.find((p) => p.canParse(workbook));

    if (!parser) {
      throw new BadRequestException({
        message: 'Unsupported bank statement format',
      });
    }

    // Parse details and transactions
    const details = parser.parseDetails(workbook);
    const parsedTransactions = parser.parseTransactions(workbook);

    // Find or create BankAccount from IBAN
    let bankAccount: BankAccount | null = null;

    if (bankAccountId) {
      bankAccount = await this.em.findOne(BankAccount, {
        id: bankAccountId,
        user: userId,
      });
      if (!bankAccount) {
        throw new BadRequestException({
          message: 'Bank account not found',
          bankAccountId,
        });
      }
    } else {
      // Find by IBAN
      bankAccount = await this.em.findOne(BankAccount, {
        iban: details.iban,
        user: userId,
      });

      // Create if not found
      if (!bankAccount) {
        // Savings parser → SAVINGS account type; main parser → CHECKING
        const accountType =
          parser instanceof BankOfGeorgiaSavingsParser
            ? AccountType.SAVINGS
            : AccountType.CHECKING;

        bankAccount = this.em.create(BankAccount, {
          iban: details.iban,
          bankName: 'Bank of Georgia',
          accountOwner: details.accountOwner,
          accountType,
          linkedCards: details.cards.map((card) => ({
            lastFour: card.slice(-4),
            label: card,
          })),
          user: userId,
        });
        this.em.persist(bankAccount);
        await this.em.flush();
        this.logger.log({ bankAccountId: bankAccount.id }, 'Bank account created from import');
      }
    }

    // Create BankImport record
    const bankImport = this.em.create(BankImport, {
      bankAccount: bankAccount.id,
      fileName: fileName || 'imported.xlsx',
      periodFrom: details.periodFrom,
      periodTo: details.periodTo,
      startingBalance: details.startingBalance,
      endBalance: details.endBalance,
      transactionCount: parsedTransactions.length,
      importedAt: new Date(),
    });

    this.em.persist(bankImport);
    await this.em.flush();

    // ── Phase 1: Extract bank exchange rates from transaction descriptions ──
    // Prefer rates embedded in the bank statement over NBG API rates.
    const exchangeRateMap = new Map<string, ExchangeRate>();
    const bankRateEntries = new Map<string, { rateToGel: number; rateCurrency: Currency; date: Date }>();

    for (const tx of parsedTransactions) {
      const bankRate = this.extractBankRate(tx.details, tx.currency);
      if (bankRate && bankRate.rateCurrency !== Currency.GEL) {
        const dateStr = tx.date.toISOString().split('T')[0]!;
        const key = `${bankRate.rateCurrency}|${dateStr}`;
        if (!bankRateEntries.has(key)) {
          bankRateEntries.set(key, { ...bankRate, date: tx.date });
        }
      }
    }

    // Create or update ExchangeRate records from bank statement rates
    if (bankRateEntries.size > 0) {
      // Batch-fetch all existing rates for bank rate entries (single query)
      const bankRateOrConditions = Array.from(bankRateEntries.keys()).map((key) => {
        const [currency, dateStr] = key.split('|') as [string, string];
        return { currency: currency as Currency, date: new Date(dateStr + 'T00:00:00.000Z') };
      });
      const existingBankRateRecords = await this.em.find(ExchangeRate, { $or: bankRateOrConditions });
      const existingBankRateMap = new Map<string, ExchangeRate>(
        existingBankRateRecords.map((r) => {
          const dStr = (r.date instanceof Date ? r.date : new Date(r.date)).toISOString().split('T')[0]!;
          return [`${r.currency}|${dStr}`, r];
        }),
      );

      // Process without DB queries in loop
      for (const [key, entry] of bankRateEntries) {
        const [currency, dateStr] = key.split('|') as [string, string];
        const date = new Date(dateStr + 'T00:00:00.000Z');

        let rate = existingBankRateMap.get(key);

        if (rate) {
          // Overwrite NBG rate with bank statement rate (more accurate)
          if (rate.source === ExchangeRateSource.NBG_API) {
            rate.rateToGel = entry.rateToGel.toString();
            rate.rawRate = entry.rateToGel.toString();
            rate.source = ExchangeRateSource.BANK_STATEMENT;
          }
        } else {
          rate = this.em.create(ExchangeRate, {
            currency: currency as Currency,
            rateToGel: entry.rateToGel.toString(),
            quantity: 1,
            rawRate: entry.rateToGel.toString(),
            date,
            source: ExchangeRateSource.BANK_STATEMENT,
          });
          this.em.persist(rate);
        }
        exchangeRateMap.set(key, rate);
      }
      await this.em.flush();
      this.logger.log(
        { bankRates: bankRateEntries.size },
        'Exchange rates extracted from bank statement descriptions',
      );
    }

    // ── Phase 2: Fetch remaining rates from NBG API ──
    // Dates without a bank rate from Phase 1 fall back to NBG.
    // The post-import reconciliation (reconcileExchangeRates) will later
    // replace these NBG rates with nearby bank rates from all imported files.
    const remainingPairs = parsedTransactions
      .filter((tx) => {
        const dateStr = tx.date.toISOString().split('T')[0]!;
        return !exchangeRateMap.has(`${tx.currency}|${dateStr}`);
      })
      .map((tx) => ({ currency: tx.currency, date: tx.date }));

    if (remainingPairs.length > 0) {
      const nbgRates = await this.exchangeRateService.ensureRatesForDates(remainingPairs);
      for (const [key, rate] of nbgRates) {
        if (!exchangeRateMap.has(key)) {
          exchangeRateMap.set(key, rate);
        }
      }
    }

    this.logger.log(
      {
        ratesResolved: exchangeRateMap.size,
        fromBank: bankRateEntries.size,
        fromNbg: remainingPairs.length,
        transactions: parsedTransactions.length,
      },
      'Exchange rates resolved for import',
    );

    // ── Phase 4: Process transactions (batch duplicate check) ──
    let created = 0;
    let skipped = 0;
    let loanCostTotal = 0;
    const skippedDetails: SkippedDetail[] = [];

    // Track deposit amounts per currency for auto-balance update
    const depositAmounts = new Map<Currency, number>();

    // Pre-compute all import hashes upfront (no DB queries)
    // Track hash occurrences within this import to handle multiple
    // identical transactions on the same day (e.g. two 500 GEL loan
    // disbursements). Append a counter suffix so each gets a unique hash.
    const hashCounters = new Map<string, number>();
    const hashEntries: Array<{ hash: string; index: number }> = [];

    for (let i = 0; i < parsedTransactions.length; i++) {
      const parsedTx = parsedTransactions[i]!;
      const baseHashInput = `${details.iban}|${parsedTx.postingDate.toISOString().split('T')[0]}|${parsedTx.details}|${parsedTx.amount}|${parsedTx.currency}`;
      const prevCount = hashCounters.get(baseHashInput) || 0;
      hashCounters.set(baseHashInput, prevCount + 1);
      const hashInput = prevCount > 0 ? `${baseHashInput}|${prevCount}` : baseHashInput;
      const importHash = createHash('sha256').update(hashInput).digest('hex');
      hashEntries.push({ hash: importHash, index: i });
    }

    // Batch query existing hashes in chunks of 5000 (single query per chunk
    // instead of one findOne per transaction — the critical N+1 fix)
    const HASH_CHUNK_SIZE = 5000;
    const existingHashSet = new Set<string>();
    const existingTxIdByHash = new Map<string, string>();

    for (let i = 0; i < hashEntries.length; i += HASH_CHUNK_SIZE) {
      const chunk = hashEntries.slice(i, i + HASH_CHUNK_SIZE).map((e) => e.hash);
      const existingTxs = await this.em.find(
        Transaction,
        { importHash: { $in: chunk } },
        { fields: ['id', 'importHash'] },
      );
      for (const tx of existingTxs) {
        existingHashSet.add(tx.importHash!);
        existingTxIdByHash.set(tx.importHash!, tx.id);
      }
    }

    // Process transactions with O(1) hash lookup (no DB queries in loop)
    const FLUSH_BATCH = 1000;
    let pendingCount = 0;
    const EXPENSE_TYPES = [TransactionType.EXPENSE, TransactionType.FEE, TransactionType.ATM_WITHDRAWAL];

    for (const { hash: importHash, index } of hashEntries) {
      const parsedTx = parsedTransactions[index]!;

      if (existingHashSet.has(importHash)) {
        const skipRecord = this.em.create(SkippedTransaction, {
          bankImport: bankImport.id,
          importHash,
          reason: 'DUPLICATE',
          date: parsedTx.date,
          amount: parsedTx.amount.toString(),
          currency: parsedTx.currency,
          rawDetails: parsedTx.details,
          existingTransaction: existingTxIdByHash.get(importHash) ?? null,
        });
        this.em.persist(skipRecord);
        skippedDetails.push({
          date: parsedTx.date.toISOString().split('T')[0]!,
          amount: parsedTx.amount.toString(),
          currency: parsedTx.currency,
          rawDetails: parsedTx.details,
          reason: 'DUPLICATE',
        });
        skipped++;
        continue;
      }

      // Track loan cost
      if (parsedTx.type === TransactionType.LOAN_INTEREST) {
        loanCostTotal += parsedTx.amount;
      }

      // Track deposit amounts for auto-balance
      if (parsedTx.type === TransactionType.DEPOSIT) {
        const current = depositAmounts.get(parsedTx.currency) || 0;
        depositAmounts.set(parsedTx.currency, current + parsedTx.amount);
      }

      // Look up pre-fetched exchange rate for this transaction's currency + date
      const rateKey = `${parsedTx.currency}|${parsedTx.date.toISOString().split('T')[0]}`;
      const exchangeRate = exchangeRateMap.get(rateKey);

      // Refunds/reversals: an inflow classified as EXPENSE/FEE/ATM_WITHDRAWAL
      // is money coming *back* to the user (e.g. taxi refund, fee reversal).
      // Reclassify as INCOME so it doesn't inflate the expense totals.
      const effectiveType =
        parsedTx.direction === 'inflow' && EXPENSE_TYPES.includes(parsedTx.type)
          ? TransactionType.INCOME
          : parsedTx.type;

      // Create Transaction entity
      const transaction = this.em.create(Transaction, {
        importHash,
        title: parsedTx.merchantName || parsedTx.details.substring(0, 100),
        amount: parsedTx.amount.toString(),
        currency: parsedTx.currency,
        type: effectiveType,
        date: parsedTx.date,
        postingDate: parsedTx.postingDate,
        merchantName: parsedTx.merchantName || null,
        merchantLocation: parsedTx.merchantLocation || null,
        mccCode: parsedTx.mccCode || null,
        cardLastFour: parsedTx.cardLastFour || null,
        rawDetails: parsedTx.details,
        metadata: { direction: parsedTx.direction },
        user: userId,
        bankImport: bankImport.id,
        exchangeRate: exchangeRate?.id ?? null,
      });

      this.em.persist(transaction);
      created++;
      pendingCount++;

      // Auto-create Loan entity for LOAN_DISBURSEMENT transactions
      if (effectiveType === TransactionType.LOAN_DISBURSEMENT) {
        // Flush current batch first so the transaction has an ID
        await this.em.flush();
        pendingCount = 0;

        const dateStr = parsedTx.date.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
        const amountStr = new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 2,
        }).format(parsedTx.amount);

        const loan = await this.loanService.create(
          {
            title: `Loan ${parsedTx.currency} ${amountStr} (${dateStr})`,
            amountLeft: parsedTx.amount,
            monthlyPayment: 0,
            currency: parsedTx.currency as Currency,
            holder: bankAccount?.accountOwner || 'Unknown',
            loanNumber: null,
          },
          userId,
        );

        // Link the disbursement transaction to the new Loan
        this.em.assign(transaction, { loan: loan.id });
        await this.em.flush();

        this.logger.log(
          { loanId: loan.id, amount: parsedTx.amount, currency: parsedTx.currency },
          'Auto-created Loan from LOAN_DISBURSEMENT',
        );
      }

      // Flush in batches of 1000 to prevent memory pressure and
      // PostgreSQL parameter limits for very large imports
      if (pendingCount >= FLUSH_BATCH) {
        await this.em.flush();
        pendingCount = 0;
      }
    }

    // Flush remaining entities
    if (pendingCount > 0) {
      await this.em.flush();
    }

    // Post-import: reclassify INCOME incoming transfers where the sender's
    // account IBAN matches any of the user's own bank accounts (catches
    // self-transfers regardless of name script / language).
    await this.reclassifySelfTransfers(userId, bankImport.id);

    // Post-import: reconcile exchange rates globally — replace NBG rates
    // with nearby bank rates that may have been created by other file
    // imports. This handles cross-account propagation regardless of
    // import order.
    await this.reconcileExchangeRates();

    // Auto-update deposit balances for DEPOSIT-type transactions
    for (const [currency, amount] of depositAmounts) {
      const deposit = await this.depositService.findActiveByCurrency(userId, currency);
      if (deposit) {
        await this.depositService.addToBalance(deposit.id, amount);
        this.logger.log(
          { depositId: deposit.id, currency, added: amount },
          'Deposit balance auto-updated from import',
        );
      } else {
        this.logger.warn(
          { currency, amount },
          'No active deposit found for auto-balance update — create a deposit to enable auto-tracking',
        );
      }
    }

    this.logger.log(
      {
        bankImportId: bankImport.id,
        created,
        skipped,
        totalTransactions: parsedTransactions.length,
        loanCostTotal,
      },
      'Bank import completed',
    );

    return {
      bankImportId: bankImport.id,
      created,
      skipped,
      totalTransactions: parsedTransactions.length,
      loanCostTotal,
      accountIban: details.iban,
      accountOwner: details.accountOwner,
      periodFrom: details.periodFrom.toISOString(),
      periodTo: details.periodTo.toISOString(),
      startingBalance: details.startingBalance,
      endBalance: details.endBalance,
      skippedDetails,
    };
  }

  // ── Exchange rate extraction from bank statement descriptions ──────

  /**
   * Try to extract the actual bank exchange rate from a transaction's
   * raw details text. Returns the rate-to-GEL and which foreign currency
   * it applies to, or null if no rate is parseable.
   *
   * Supported patterns:
   * 1. "Bank conversion rate (USD-GEL): 2.6596"
   * 2. "FX Rate:2.679. Counter-amount: GEL203.6"
   * 3. "FX Rate:2.682. Counter-amount: USD100."  (tx is in GEL)
   * 4. "Automatic conversion, rate: 2.66"  (no explicit currency pair)
   */
  private extractBankRate(
    details: string,
    txCurrency: Currency,
  ): { rateToGel: number; rateCurrency: Currency } | null {
    // Pattern 1: "Bank conversion rate (USD-GEL): 2.6596"
    // Explicit currency pair with GEL as target
    const bankConvMatch = details.match(
      /Bank conversion rate \((\w+)-GEL\):\s*([\d.]+)/i,
    );
    if (bankConvMatch) {
      const cur = bankConvMatch[1]!.toUpperCase();
      const rate = parseFloat(bankConvMatch[2]!);
      if (!isNaN(rate) && rate > 0 && this.isTrackedCurrency(cur)) {
        return { rateToGel: rate, rateCurrency: cur as Currency };
      }
    }

    // Pattern 2 & 3: "FX Rate:X.XXX. Counter-amount: CURYYY."
    const fxRateMatch = details.match(/FX Rate:([\d.]+)/i);
    if (fxRateMatch) {
      const rate = parseFloat(fxRateMatch[1]!);
      if (isNaN(rate) || rate <= 0) return null;

      const counterMatch = details.match(/Counter-amount:\s*([A-Z]{3})/i);
      if (counterMatch) {
        const counterCur = counterMatch[1]!.toUpperCase();

        if (counterCur === 'GEL' && txCurrency !== Currency.GEL) {
          // Transaction is in foreign currency, rate = txCurrency→GEL
          return { rateToGel: rate, rateCurrency: txCurrency };
        }

        if (txCurrency === Currency.GEL && this.isTrackedCurrency(counterCur)) {
          // Transaction is in GEL, rate = counterCurrency→GEL
          return { rateToGel: rate, rateCurrency: counterCur as Currency };
        }
      }
    }

    // Pattern 4: "Automatic conversion, rate: 2.66"
    // No explicit currency pair — infer from txCurrency and rate range.
    // For non-GEL transactions, the rate is txCurrency→GEL if it falls
    // in a reasonable range. Cross-currency conversions (e.g., EUR→USD
    // at 1.23) are detected and skipped because the rate doesn't match
    // any plausible X→GEL range.
    const autoConvMatch = details.match(
      /Automatic conversion,?\s*rate:\s*([\d.]+)/i,
    );
    if (autoConvMatch) {
      const rate = parseFloat(autoConvMatch[1]!);
      if (isNaN(rate) || rate <= 0) return null;

      if (txCurrency !== Currency.GEL && this.isTrackedCurrency(txCurrency)) {
        // Validate rate is plausible for txCurrency→GEL
        if (this.isPlausibleRateToGel(txCurrency, rate)) {
          return { rateToGel: rate, rateCurrency: txCurrency };
        }
      }

      if (txCurrency === Currency.GEL) {
        // GEL-side of an auto-conversion: rate is foreignCurrency→GEL.
        // Try to identify which foreign currency based on rate range.
        const inferredCurrency = this.inferCurrencyFromRate(rate);
        if (inferredCurrency) {
          return { rateToGel: rate, rateCurrency: inferredCurrency };
        }
      }
    }

    return null;
  }

  /** Check if a rate is plausible for currency→GEL conversion */
  private isPlausibleRateToGel(currency: Currency | string, rate: number): boolean {
    // Ranges based on historical NBG rates with generous margins
    const ranges: Record<string, [number, number]> = {
      USD: [1.5, 5.0],
      EUR: [1.8, 6.0],
      GBP: [2.0, 7.0],
      RUB: [0.005, 0.15],
    };
    const range = ranges[currency];
    if (!range) return false;
    return rate >= range[0] && rate <= range[1];
  }

  /** Try to identify which foreign currency a rate belongs to */
  private inferCurrencyFromRate(rate: number): Currency | null {
    if (rate >= 1.5 && rate < 3.5) return Currency.USD;
    if (rate >= 2.5 && rate < 4.5) return Currency.EUR;
    if (rate >= 3.0 && rate < 5.5) return Currency.GBP;
    if (rate >= 0.005 && rate < 0.1) return Currency.RUB;
    return null;
  }

  private isTrackedCurrency(code: string): boolean {
    return ['USD', 'EUR', 'GBP', 'RUB'].includes(code);
  }

  /**
   * Post-import: replace NBG_API exchange rates with nearby BANK_STATEMENT
   * rates. This handles cross-account propagation regardless of import order.
   *
   * For each NBG_API rate in the database, find the nearest BANK_STATEMENT
   * rate for the same currency within ±3 days. If found, overwrite.
   * Also updates all transactions that were linked to the old NBG rate.
   */
  private async reconcileExchangeRates(): Promise<void> {
    const MAX_DAYS = 3;

    // Get all bank statement rates, grouped by currency
    const bankRates = await this.em.find(ExchangeRate, {
      source: ExchangeRateSource.BANK_STATEMENT,
    });

    const bankRatesByCurrency = new Map<string, Array<{ date: Date; rate: ExchangeRate }>>();
    for (const br of bankRates) {
      const d = br.date instanceof Date ? br.date : new Date(br.date);
      if (!bankRatesByCurrency.has(br.currency)) {
        bankRatesByCurrency.set(br.currency, []);
      }
      bankRatesByCurrency.get(br.currency)!.push({ date: d, rate: br });
    }

    // Get all NBG rates
    const nbgRates = await this.em.find(ExchangeRate, {
      source: ExchangeRateSource.NBG_API,
    });

    let reconciled = 0;
    for (const nbgRate of nbgRates) {
      const bankDates = bankRatesByCurrency.get(nbgRate.currency);
      if (!bankDates?.length) continue;

      const nbgDate = nbgRate.date instanceof Date ? nbgRate.date : new Date(nbgRate.date);

      // Find nearest bank rate within ±MAX_DAYS
      let nearest: ExchangeRate | null = null;
      let nearestDist = Infinity;
      for (const bd of bankDates) {
        const dist = Math.abs(nbgDate.getTime() - bd.date.getTime()) / 86400000;
        if (dist < nearestDist && dist <= MAX_DAYS && dist > 0) {
          nearestDist = dist;
          nearest = bd.rate;
        }
      }

      if (nearest) {
        nbgRate.rateToGel = nearest.rateToGel;
        nbgRate.rawRate = nearest.rawRate;
        nbgRate.source = ExchangeRateSource.BANK_STATEMENT;
        reconciled++;
      }
    }

    if (reconciled > 0) {
      await this.em.flush();
      this.logger.log(
        { reconciled },
        'Reconciled NBG rates with nearby bank statement rates',
      );
    }
  }

  /**
   * After import, check ALL the user's INCOME "incoming transfer"
   * transactions whose sender IBAN matches any of the user's own bank
   * accounts and reclassify them as TRANSFER.
   *
   * Runs globally (not just the current import) because new bank accounts
   * are discovered as statements are imported — a savings statement may be
   * imported before the personal-account statement, so the personal IBAN
   * isn't known yet at that point. Running globally on every import
   * ensures earlier misclassifications are corrected as new IBANs appear.
   */
  private async reclassifySelfTransfers(
    userId: string,
    _bankImportId: string,
  ): Promise<void> {
    // Get all user's bank account IBANs
    const userAccounts = await this.em.find(BankAccount, { user: userId });
    const userIbans = userAccounts.map((a) => a.iban).filter(Boolean);
    if (userIbans.length === 0) return;

    // Find user's INCOME transactions that contain "incoming transfer" in details
    // (scoped query instead of loading ALL income transactions)
    const incomeTxns = await this.em.find(Transaction, {
      user: userId,
      type: TransactionType.INCOME,
      rawDetails: { $ilike: '%incoming transfer%' },
    });

    let reclassified = 0;
    for (const tx of incomeTxns) {
      const details = tx.rawDetails || '';
      if (!details.toLowerCase().includes('incoming transfer')) continue;

      // Check if sender's account matches any of the user's IBANs
      const senderAccountMatch = details.match(/Account:\s*(GE\w+)/i);
      if (!senderAccountMatch?.[1]) continue;

      const senderAccount = senderAccountMatch[1]
        .replace(/(USD|GEL|EUR|GBP|RUB)$/i, ''); // strip currency suffix

      if (userIbans.includes(senderAccount)) {
        tx.type = TransactionType.TRANSFER;
        reclassified++;
      }
    }

    if (reclassified > 0) {
      await this.em.flush();
      this.logger.log(
        { reclassified },
        'Reclassified incoming self-transfers to TRANSFER (global pass)',
      );
    }
  }
}
