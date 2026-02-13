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
      for (const [key, entry] of bankRateEntries) {
        const [currency, dateStr] = key.split('|') as [string, string];
        const date = new Date(dateStr + 'T00:00:00.000Z');

        let rate = await this.em.findOne(ExchangeRate, {
          currency: currency as Currency,
          date,
        });

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
      { ratesResolved: exchangeRateMap.size, fromBank: bankRateEntries.size, transactions: parsedTransactions.length },
      'Exchange rates resolved for import',
    );

    // Process transactions
    let created = 0;
    let skipped = 0;
    let loanCostTotal = 0;
    const skippedDetails: SkippedDetail[] = [];

    // Track deposit amounts per currency for auto-balance update
    const depositAmounts = new Map<Currency, number>();

    // Track hash occurrences within this import to handle multiple
    // identical transactions on the same day (e.g. two 500 GEL loan
    // disbursements). Append a counter suffix so each gets a unique hash.
    const hashCounters = new Map<string, number>();

    for (const parsedTx of parsedTransactions) {
      // Compute base hash input
      const baseHashInput = `${details.iban}|${parsedTx.postingDate.toISOString().split('T')[0]}|${parsedTx.details}|${parsedTx.amount}|${parsedTx.currency}`;

      // If we've seen this exact hash input before (within this import),
      // append an occurrence counter to make it unique
      const prevCount = hashCounters.get(baseHashInput) || 0;
      hashCounters.set(baseHashInput, prevCount + 1);
      const hashInput = prevCount > 0 ? `${baseHashInput}|${prevCount}` : baseHashInput;
      const importHash = createHash('sha256').update(hashInput).digest('hex');

      // Check if importHash already exists (skip if so)
      const existing = await this.em.findOne(Transaction, { importHash });
      if (existing) {
        // Persist skip reason
        const skipRecord = this.em.create(SkippedTransaction, {
          bankImport: bankImport.id,
          importHash,
          reason: 'DUPLICATE',
          date: parsedTx.date,
          amount: parsedTx.amount.toString(),
          currency: parsedTx.currency,
          rawDetails: parsedTx.details,
          existingTransaction: existing.id,
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
      const EXPENSE_TYPES = [TransactionType.EXPENSE, TransactionType.FEE, TransactionType.ATM_WITHDRAWAL];
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
    }

    // Flush all transactions
    await this.em.flush();

    // Post-import: reclassify INCOME incoming transfers where the sender's
    // account IBAN matches any of the user's own bank accounts (catches
    // self-transfers regardless of name script / language).
    await this.reclassifySelfTransfers(userId, bankImport.id);

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

    return null;
  }

  private isTrackedCurrency(code: string): boolean {
    return ['USD', 'EUR', 'GBP', 'RUB'].includes(code);
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

    // Find ALL user's INCOME transactions that are incoming transfers
    const incomeTxns = await this.em.find(Transaction, {
      user: userId,
      type: TransactionType.INCOME,
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
