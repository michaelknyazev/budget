import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { EntityManager, FilterQuery } from '@mikro-orm/postgresql';
import { Transaction } from '../entities/transaction.entity';
import { LoanService } from '@/loan/services/loan.service';
import {
  CreateTransactionInput,
  UpdateTransactionInput,
  QueryTransactionsInput,
  Currency,
  TransactionType,
} from '@budget/schemas';

const LOAN_REPAYMENT_TYPES: TransactionType[] = [
  TransactionType.LOAN_REPAYMENT,
  TransactionType.LOAN_INTEREST,
];

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly loanService: LoanService,
  ) {}

  async findAll(userId: string): Promise<Transaction[]> {
    return this.em.find(Transaction, { user: userId }, { populate: ['category'] });
  }

  async findById(id: string): Promise<Transaction> {
    const transaction = await this.em.findOne(
      Transaction,
      { id },
      { populate: ['category', 'bankImport', 'incomeSource', 'plannedIncome', 'budgetTarget', 'loan'] },
    );
    if (!transaction) {
      throw new NotFoundException({ message: 'Transaction not found', id });
    }
    return transaction;
  }

  async findByUserId(
    userId: string,
    query: QueryTransactionsInput,
  ): Promise<{ transactions: Transaction[]; total: number }> {
    const where: FilterQuery<Transaction> = { user: userId };

    if (query.untrackedIncome) {
      where.type = { $in: [TransactionType.INCOME, TransactionType.INTEREST_INCOME] } as any;
      where.plannedIncome = null;
    } else if (query.untrackedExpenses) {
      where.type = { $in: [TransactionType.EXPENSE, TransactionType.FEE, TransactionType.ATM_WITHDRAWAL] } as any;
      where.budgetTarget = null;
    } else if (query.type) {
      where.type = query.type as TransactionType;
    }
    if (query.currency) where.currency = query.currency as Currency;
    if (query.categoryId) where.category = query.categoryId;
    if (query.mccCode) where.mccCode = query.mccCode;
    if (query.merchantName) {
      where.merchantName = { $ilike: `%${query.merchantName}%` };
    }
    if (query.day && query.month && query.year) {
      const specificDate = new Date(Date.UTC(query.year, query.month - 1, query.day));
      where.date = { $gte: specificDate, $lte: specificDate };
    } else if (query.month && query.year) {
      const startDate = new Date(Date.UTC(query.year, query.month - 1, 1));
      const endDate = new Date(Date.UTC(query.year, query.month, 0));
      where.date = { $gte: startDate, $lte: endDate };
    } else if (query.year) {
      const startDate = new Date(Date.UTC(query.year, 0, 1));
      const endDate = new Date(Date.UTC(query.year, 11, 31));
      where.date = { $gte: startDate, $lte: endDate };
    }

    const [transactions, total] = await this.em.findAndCount(Transaction, where, {
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
      orderBy: { date: 'DESC' },
      populate: ['category', 'incomeSource', 'plannedIncome', 'budgetTarget', 'loan', 'exchangeRate'],
    });

    return { transactions, total };
  }

  async create(data: CreateTransactionInput, userId: string): Promise<Transaction> {
    const transaction = this.em.create(Transaction, {
      ...data,
      amount: data.amount.toString(),
      currency: data.currency as Currency,
      type: data.type as TransactionType,
      date: new Date(data.date),
      user: userId,
      category: data.categoryId || null,
      incomeSource: data.incomeSourceId || null,
      plannedIncome: data.plannedIncomeId || null,
      budgetTarget: data.budgetTargetId || null,
      loan: data.loanId || null,
    });

    this.em.persist(transaction);
    await this.em.flush();

    // Auto-adjust loan amountLeft when linking a repayment
    if (data.loanId && LOAN_REPAYMENT_TYPES.includes(data.type as TransactionType)) {
      await this.adjustLoanBalance(data.loanId, -data.amount);
    }

    this.logger.log({ transactionId: transaction.id }, 'Transaction created');
    return transaction;
  }

  async update(id: string, data: UpdateTransactionInput): Promise<Transaction> {
    const transaction = await this.findById(id);
    const oldLoanId = transaction.loan?.id || null;
    const txType = (data.type ?? transaction.type) as TransactionType;
    const txAmount = data.amount ?? parseFloat(transaction.amount);

    const updateData: Partial<Transaction> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.amount !== undefined) updateData.amount = data.amount.toString();
    if (data.currency !== undefined) updateData.currency = data.currency as Currency;
    if (data.type !== undefined) updateData.type = data.type as TransactionType;
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.merchantName !== undefined) updateData.merchantName = data.merchantName;
    if (data.merchantLocation !== undefined) updateData.merchantLocation = data.merchantLocation;
    if (data.mccCode !== undefined) updateData.mccCode = data.mccCode;
    if (data.categoryId !== undefined) updateData.category = data.categoryId || null;
    if (data.incomeSourceId !== undefined)
      updateData.incomeSource = data.incomeSourceId || null;
    if (data.plannedIncomeId !== undefined)
      updateData.plannedIncome = data.plannedIncomeId || null;
    if (data.budgetTargetId !== undefined)
      updateData.budgetTarget = data.budgetTargetId || null;
    if (data.loanId !== undefined)
      updateData.loan = data.loanId || null;

    this.em.assign(transaction, updateData);
    await this.em.flush();

    // Auto-adjust loan amountLeft when loanId changes for repayment types
    if (data.loanId !== undefined && LOAN_REPAYMENT_TYPES.includes(txType)) {
      const newLoanId = data.loanId || null;
      if (oldLoanId !== newLoanId) {
        // Restore old loan balance
        if (oldLoanId) {
          await this.adjustLoanBalance(oldLoanId, txAmount);
        }
        // Reduce new loan balance
        if (newLoanId) {
          await this.adjustLoanBalance(newLoanId, -txAmount);
        }
      }
    }

    this.logger.log({ transactionId: id }, 'Transaction updated');
    return transaction;
  }

  async delete(id: string): Promise<void> {
    const transaction = await this.findById(id);

    // Restore loan balance if deleting a linked repayment
    const loanId = transaction.loan?.id;
    if (loanId && LOAN_REPAYMENT_TYPES.includes(transaction.type as TransactionType)) {
      await this.adjustLoanBalance(loanId, parseFloat(transaction.amount));
    }

    await this.em.removeAndFlush(transaction);
    this.logger.log({ transactionId: id }, 'Transaction deleted');
  }

  private async adjustLoanBalance(loanId: string, delta: number): Promise<void> {
    try {
      const loan = await this.loanService.findById(loanId);
      const newAmount = Math.max(0, parseFloat(loan.amountLeft) + delta);
      const isRepaid = newAmount === 0;
      await this.loanService.update(loanId, { amountLeft: newAmount, isRepaid });
      this.logger.log({ loanId, delta, newAmount, isRepaid }, 'Loan balance adjusted');
    } catch (error) {
      this.logger.warn({ loanId, delta }, 'Failed to adjust loan balance');
    }
  }
}
