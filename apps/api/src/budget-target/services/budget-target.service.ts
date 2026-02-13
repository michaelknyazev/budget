import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { UniqueConstraintViolationException, EntityManager } from '@mikro-orm/postgresql';
import { BudgetTarget } from '../entities/budget-target.entity';
import { Transaction } from '@/transaction/entities/transaction.entity';
import { ExchangeRateService } from '@/exchange-rate/services/exchange-rate.service';
import { CreateBudgetTargetInput, Currency } from '@budget/schemas';
import type { BudgetTargetComparisonResponse } from '@budget/schemas';

@Injectable()
export class BudgetTargetService {
  private readonly logger = new Logger(BudgetTargetService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly exchangeRateService: ExchangeRateService,
  ) {}

  async findAll(
    userId: string,
    year?: number,
    month?: number,
  ): Promise<BudgetTarget[]> {
    const where: Record<string, unknown> = { user: userId };
    if (year !== undefined) where.year = year;
    if (month !== undefined) where.month = month;

    return this.em.find(BudgetTarget, where, {
      populate: ['category'],
      orderBy: { month: 'ASC', name: 'ASC' },
    });
  }

  async findById(id: string): Promise<BudgetTarget> {
    const target = await this.em.findOne(BudgetTarget, { id }, { populate: ['category'] });
    if (!target) {
      throw new NotFoundException({ message: 'Budget target not found', id });
    }
    return target;
  }

  async create(data: CreateBudgetTargetInput, userId: string): Promise<BudgetTarget> {
    const target = this.em.create(BudgetTarget, {
      name: data.name,
      targetAmount: data.targetAmount.toString(),
      currency: data.currency as Currency,
      month: data.month,
      year: data.year,
      type: 'EXPENSE',
      user: userId,
      category: data.categoryId || null,
    });

    this.em.persist(target);
    try {
      await this.em.flush();
    } catch (error) {
      if (error instanceof UniqueConstraintViolationException) {
        throw new ConflictException({
          message: 'Planned expense already exists with this name for the selected month',
          name: data.name,
          month: data.month,
          year: data.year,
        });
      }
      throw error;
    }
    this.logger.log({ targetId: target.id }, 'Budget target created');

    return target;
  }

  async update(id: string, data: Partial<CreateBudgetTargetInput>): Promise<BudgetTarget> {
    const target = await this.findById(id);

    const updateData: Partial<BudgetTarget> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.categoryId !== undefined) updateData.category = data.categoryId || null;
    if (data.month !== undefined) updateData.month = data.month;
    if (data.year !== undefined) updateData.year = data.year;
    if (data.targetAmount !== undefined) updateData.targetAmount = data.targetAmount.toString();
    if (data.currency !== undefined) updateData.currency = data.currency as Currency;

    this.em.assign(target, updateData);
    await this.em.flush();
    this.logger.log({ targetId: id }, 'Budget target updated');

    return target;
  }

  async delete(id: string): Promise<void> {
    const target = await this.findById(id);
    await this.em.removeAndFlush(target);
    this.logger.log({ targetId: id }, 'Budget target deleted');
  }

  async copyFromPreviousMonth(
    userId: string,
    targetMonth: number,
    targetYear: number,
  ): Promise<BudgetTarget[]> {
    let prevMonth = targetMonth - 1;
    let prevYear = targetYear;
    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear -= 1;
    }

    const previousTargets = await this.findAll(userId, prevYear, prevMonth);
    if (previousTargets.length === 0) {
      return [];
    }

    const created: BudgetTarget[] = [];
    for (const prev of previousTargets) {
      try {
        const newTarget = await this.create(
          {
            name: prev.name,
            categoryId: prev.category?.id || null,
            month: targetMonth,
            year: targetYear,
            targetAmount: parseFloat(prev.targetAmount),
            currency: prev.currency,
          },
          userId,
        );
        created.push(newTarget);
      } catch {
        this.logger.warn(
          { name: prev.name, targetMonth, targetYear },
          'Skipping duplicate planned expense during copy',
        );
      }
    }

    this.logger.log(
      { count: created.length, targetMonth, targetYear },
      'Copied planned expenses from previous month',
    );
    return created;
  }

  async getComparison(
    userId: string,
    month: number,
    year: number,
    displayCurrency: string,
  ): Promise<BudgetTargetComparisonResponse> {
    const targets = await this.findAll(userId, year, month);

    const midDate = new Date(year, month - 1, 15);

    const items = [];
    let totalPlanned = 0;
    let totalActual = 0;

    for (const target of targets) {
      const plannedAmount = parseFloat(target.targetAmount);
      const sourceCurrency = target.currency;

      // Get transactions linked to this budget target
      const transactions = await this.em.find(Transaction, {
        budgetTarget: target.id,
      } as any);

      const actualAmount = transactions.reduce(
        (sum, tx) => sum + parseFloat(tx.amount),
        0,
      );

      const convertedPlanned = await this.convert(
        plannedAmount,
        sourceCurrency,
        displayCurrency,
        midDate,
      );
      const convertedActual = await this.convert(
        actualAmount,
        sourceCurrency,
        displayCurrency,
        midDate,
      );

      let status: 'paid' | 'partial' | 'pending' = 'pending';
      if (actualAmount >= plannedAmount && plannedAmount > 0) {
        status = 'paid';
      } else if (actualAmount > 0) {
        status = 'partial';
      }

      totalPlanned += convertedPlanned;
      totalActual += convertedActual;

      items.push({
        budgetTargetId: target.id,
        name: target.name,
        categoryName: target.category?.name || null,
        plannedAmount: this.round(plannedAmount),
        actualAmount: this.round(actualAmount),
        plannedCurrency: sourceCurrency,
        convertedPlannedAmount: this.round(convertedPlanned),
        convertedActualAmount: this.round(convertedActual),
        status,
        linkedTransactionCount: transactions.length,
      });
    }

    return {
      month,
      year,
      currency: displayCurrency,
      items,
      totalPlanned: this.round(totalPlanned),
      totalActual: this.round(totalActual),
    };
  }

  private async convert(
    amount: number,
    from: string,
    to: string,
    date: Date,
  ): Promise<number> {
    if (from === to) return amount;
    try {
      return await this.exchangeRateService.convertAmount(amount, from, to, date);
    } catch {
      return amount;
    }
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
