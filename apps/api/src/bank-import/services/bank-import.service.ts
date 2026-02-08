import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { createHash } from 'crypto';
import * as XLSX from 'xlsx';
import { BankImport } from '../entities/bank-import.entity';
import { Transaction } from '@/transaction/entities/transaction.entity';
import { BankAccount } from '@/bank-account/entities/bank-account.entity';
import { BankOfGeorgiaParser } from '../parsers/bank-of-georgia.parser';
import { DepositService } from '@/deposit/services/deposit.service';
import { ImportResult } from '../types/parser.types';
import { TransactionType, AccountType, Currency } from '@budget/schemas';

@Injectable()
export class BankImportService {
  private readonly logger = new Logger(BankImportService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly depositService: DepositService,
  ) {}

  async processFile(
    file: Buffer,
    userId: string,
    bankAccountId?: string,
  ): Promise<ImportResult> {
    // Parse workbook
    const workbook = XLSX.read(file, { type: 'buffer' });

    // Use BankOfGeorgiaParser (for now, hardcoded)
    const parser = new BankOfGeorgiaParser();

    if (!parser.canParse(workbook)) {
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
        bankAccount = this.em.create(BankAccount, {
          iban: details.iban,
          bankName: 'Bank of Georgia',
          accountOwner: details.accountOwner,
          accountType: AccountType.CHECKING,
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
      fileName: 'imported.xlsx', // TODO: get filename from upload
      periodFrom: details.periodFrom,
      periodTo: details.periodTo,
      startingBalance: details.startingBalance,
      endBalance: details.endBalance,
      transactionCount: parsedTransactions.length,
      importedAt: new Date(),
    });

    this.em.persist(bankImport);
    await this.em.flush();

    // Process transactions
    let created = 0;
    let skipped = 0;
    let loanCostTotal = 0;

    // Track deposit amounts per currency for auto-balance update
    const depositAmounts = new Map<Currency, number>();

    for (const parsedTx of parsedTransactions) {
      // Compute importHash: SHA-256 of `${iban}|${postingDate}|${details}|${amount}|${currency}`
      const hashInput = `${details.iban}|${parsedTx.postingDate.toISOString().split('T')[0]}|${parsedTx.details}|${parsedTx.amount}|${parsedTx.currency}`;
      const importHash = createHash('sha256').update(hashInput).digest('hex');

      // Check if importHash already exists (skip if so)
      const existing = await this.em.findOne(Transaction, { importHash });
      if (existing) {
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

      // Create Transaction entity
      const transaction = this.em.create(Transaction, {
        importHash,
        title: parsedTx.merchantName || parsedTx.details.substring(0, 100),
        amount: parsedTx.amount.toString(),
        currency: parsedTx.currency,
        type: parsedTx.type,
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
      });

      this.em.persist(transaction);
      created++;
    }

    // Flush all transactions
    await this.em.flush();

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
    };
  }
}
