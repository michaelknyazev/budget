import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { EntityManager, FilterQuery } from '@mikro-orm/postgresql';
import { Transaction } from '../entities/transaction.entity';
import {
  CreateTransactionInput,
  UpdateTransactionInput,
  QueryTransactionsInput,
  Currency,
  TransactionType,
} from '@budget/schemas';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(private readonly em: EntityManager) {}

  async findAll(userId: string): Promise<Transaction[]> {
    return this.em.find(Transaction, { user: userId }, { populate: ['category'] });
  }

  async findById(id: string): Promise<Transaction> {
    const transaction = await this.em.findOne(
      Transaction,
      { id },
      { populate: ['category', 'bankImport', 'incomeSource', 'plannedIncome'] },
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

    if (query.type) where.type = query.type as TransactionType;
    if (query.currency) where.currency = query.currency as Currency;
    if (query.categoryId) where.category = query.categoryId;
    if (query.mccCode) where.mccCode = query.mccCode;
    if (query.merchantName) {
      where.merchantName = { $ilike: `%${query.merchantName}%` };
    }
    if (query.month && query.year) {
      const startDate = new Date(query.year, query.month - 1, 1);
      const endDate = new Date(query.year, query.month, 0);
      where.date = { $gte: startDate, $lte: endDate };
    } else if (query.year) {
      const startDate = new Date(query.year, 0, 1);
      const endDate = new Date(query.year, 11, 31);
      where.date = { $gte: startDate, $lte: endDate };
    }

    const [transactions, total] = await this.em.findAndCount(Transaction, where, {
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
      orderBy: { date: 'DESC' },
      populate: ['category', 'incomeSource', 'plannedIncome', 'exchangeRate'],
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
    });

    this.em.persist(transaction);
    await this.em.flush();
    this.logger.log({ transactionId: transaction.id }, 'Transaction created');

    return transaction;
  }

  async update(id: string, data: UpdateTransactionInput): Promise<Transaction> {
    const transaction = await this.findById(id);

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

    this.em.assign(transaction, updateData);
    await this.em.flush();
    this.logger.log({ transactionId: id }, 'Transaction updated');

    return transaction;
  }

  async delete(id: string): Promise<void> {
    const transaction = await this.findById(id);
    await this.em.removeAndFlush(transaction);
    this.logger.log({ transactionId: id }, 'Transaction deleted');
  }
}
