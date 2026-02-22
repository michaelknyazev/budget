import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { UniqueConstraintViolationException, EntityManager } from '@mikro-orm/postgresql';
import { PlannedIncome } from '../entities/planned-income.entity';
import { Transaction } from '@/transaction/entities/transaction.entity';
import { IncomeSourceService } from '@/income-source/services/income-source.service';
import { ExchangeRateService } from '@/exchange-rate/services/exchange-rate.service';
import {
  CreatePlannedIncomeInput,
  UpdatePlannedIncomeInput,
} from '@budget/schemas';
import type { PlannedIncomeComparisonResponse } from '@budget/schemas';

@Injectable()
export class PlannedIncomeService {
  private readonly logger = new Logger(PlannedIncomeService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly incomeSourceService: IncomeSourceService,
    private readonly exchangeRateService: ExchangeRateService,
  ) {}

  async findAll(
    userId: string,
    year: number,
    month?: number,
  ): Promise<PlannedIncome[]> {
    const where: Record<string, unknown> = { user: userId, year };
    if (month !== undefined) where.month = month;

    return this.em.find(PlannedIncome, where, {
      populate: ['incomeSource'],
      orderBy: { month: 'ASC' },
    });
  }

  async findById(id: string): Promise<PlannedIncome> {
    const planned = await this.em.findOne(PlannedIncome, { id }, {
      populate: ['incomeSource'],
    });
    if (!planned) {
      throw new NotFoundException({ message: 'Planned income not found', id });
    }
    return planned;
  }

  async create(
    data: CreatePlannedIncomeInput,
    userId: string,
  ): Promise<PlannedIncome> {
    // Verify income source exists and belongs to user
    await this.incomeSourceService.findById(data.incomeSourceId);

    const planned = this.em.create(PlannedIncome, {
      user: userId,
      incomeSource: data.incomeSourceId,
      month: data.month,
      year: data.year,
      plannedAmount: data.plannedAmount.toString(),
      notes: data.notes || null,
    });

    this.em.persist(planned);
    try {
      await this.em.flush();
    } catch (error) {
      if (error instanceof UniqueConstraintViolationException) {
        throw new ConflictException({
          message: 'Planned income already exists for this income source in the selected month',
          incomeSourceId: data.incomeSourceId,
          month: data.month,
          year: data.year,
        });
      }
      throw error;
    }
    this.logger.log({ plannedIncomeId: planned.id }, 'Planned income created');

    return planned;
  }

  async update(
    id: string,
    data: UpdatePlannedIncomeInput,
  ): Promise<PlannedIncome> {
    const planned = await this.findById(id);

    const updateData: Partial<PlannedIncome> = {};
    if (data.incomeSourceId !== undefined)
      updateData.incomeSource = data.incomeSourceId;
    if (data.month !== undefined) updateData.month = data.month;
    if (data.year !== undefined) updateData.year = data.year;
    if (data.plannedAmount !== undefined)
      updateData.plannedAmount = data.plannedAmount.toString();
    if (data.notes !== undefined) updateData.notes = data.notes || null;

    this.em.assign(planned, updateData);
    await this.em.flush();
    this.logger.log({ plannedIncomeId: id }, 'Planned income updated');

    return planned;
  }

  async delete(id: string): Promise<void> {
    const planned = await this.findById(id);
    await this.em.removeAndFlush(planned);
    this.logger.log({ plannedIncomeId: id }, 'Planned income deleted');
  }

  async copyFromPreviousMonth(
    userId: string,
    targetMonth: number,
    targetYear: number,
  ): Promise<PlannedIncome[]> {
    // Calculate previous month
    let prevMonth = targetMonth - 1;
    let prevYear = targetYear;
    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear -= 1;
    }

    const previousPlans = await this.findAll(userId, prevYear, prevMonth);
    if (previousPlans.length === 0) {
      return [];
    }

    const created: PlannedIncome[] = [];
    for (const prev of previousPlans) {
      try {
        const newPlan = await this.create(
          {
            incomeSourceId: prev.incomeSource.id,
            month: targetMonth,
            year: targetYear,
            plannedAmount: parseFloat(prev.plannedAmount),
            notes: prev.notes,
          },
          userId,
        );
        created.push(newPlan);
      } catch {
        // Skip if duplicate (unique constraint)
        this.logger.warn(
          {
            incomeSourceId: prev.incomeSource.id,
            targetMonth,
            targetYear,
          },
          'Skipping duplicate planned income during copy',
        );
      }
    }

    this.logger.log(
      { count: created.length, targetMonth, targetYear },
      'Copied planned income from previous month',
    );
    return created;
  }

  async getComparison(
    userId: string,
    month: number,
    year: number,
    displayCurrency: string,
  ): Promise<PlannedIncomeComparisonResponse> {
    // Get planned income for this month
    const plannedItems = await this.findAll(userId, year, month);

    const midDate = new Date(Date.UTC(year, month - 1, 15));

    const items = [];
    let totalPlanned = 0;
    let totalActual = 0;

    for (const planned of plannedItems) {
      const plannedAmount = parseFloat(planned.plannedAmount);
      const sourceCurrency = planned.incomeSource.currency;

      // Get transactions manually linked to this planned income entry
      const transactions = await this.em.find(Transaction, {
        plannedIncome: planned.id,
      } as any);

      const actualAmount = transactions.reduce(
        (sum, tx) => sum + parseFloat(tx.amount),
        0,
      );

      // Convert to display currency
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

      // Determine status based on linked transactions
      let status: 'received' | 'partial' | 'pending' = 'pending';
      if (actualAmount >= plannedAmount && plannedAmount > 0) {
        status = 'received';
      } else if (actualAmount > 0) {
        status = 'partial';
      }

      totalPlanned += convertedPlanned;
      totalActual += convertedActual;

      items.push({
        plannedIncomeId: planned.id,
        incomeSourceId: planned.incomeSource.id,
        incomeSourceName: planned.incomeSource.name,
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
      return await this.exchangeRateService.convertAmount(
        amount,
        from,
        to,
        date,
      );
    } catch {
      return amount;
    }
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
