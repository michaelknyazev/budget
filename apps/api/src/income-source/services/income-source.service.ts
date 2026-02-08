import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { IncomeSource } from '../entities/income-source.entity';
import { CreateIncomeSourceInput, UpdateIncomeSourceInput, Currency } from '@budget/schemas';

@Injectable()
export class IncomeSourceService {
  private readonly logger = new Logger(IncomeSourceService.name);

  constructor(private readonly em: EntityManager) {}

  async findAll(userId: string): Promise<IncomeSource[]> {
    return this.em.find(IncomeSource, { user: userId });
  }

  async findById(id: string): Promise<IncomeSource> {
    const incomeSource = await this.em.findOne(IncomeSource, { id });
    if (!incomeSource) {
      throw new NotFoundException({ message: 'Income source not found', id });
    }
    return incomeSource;
  }

  async create(data: CreateIncomeSourceInput, userId: string): Promise<IncomeSource> {
    const incomeSource = this.em.create(IncomeSource, {
      ...data,
      currency: data.currency as Currency,
      defaultAmount: data.defaultAmount?.toString() || null,
      user: userId,
    });

    this.em.persist(incomeSource);
    await this.em.flush();
    this.logger.log({ incomeSourceId: incomeSource.id }, 'Income source created');

    return incomeSource;
  }

  async update(id: string, data: UpdateIncomeSourceInput): Promise<IncomeSource> {
    const incomeSource = await this.findById(id);

    const updateData: Partial<IncomeSource> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.currency !== undefined) updateData.currency = data.currency as Currency;
    if (data.defaultAmount !== undefined)
      updateData.defaultAmount = data.defaultAmount?.toString() || null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    this.em.assign(incomeSource, updateData);
    await this.em.flush();
    this.logger.log({ incomeSourceId: id }, 'Income source updated');

    return incomeSource;
  }

  async delete(id: string): Promise<void> {
    const incomeSource = await this.findById(id);
    await this.em.removeAndFlush(incomeSource);
    this.logger.log({ incomeSourceId: id }, 'Income source deleted');
  }
}
