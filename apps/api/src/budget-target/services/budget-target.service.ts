import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { BudgetTarget } from '../entities/budget-target.entity';
import { CreateBudgetTargetInput, Currency } from '@budget/schemas';

@Injectable()
export class BudgetTargetService {
  private readonly logger = new Logger(BudgetTargetService.name);

  constructor(private readonly em: EntityManager) {}

  async findAll(userId: string): Promise<BudgetTarget[]> {
    return this.em.find(BudgetTarget, { user: userId }, { populate: ['category'] });
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
      ...data,
      targetAmount: data.targetAmount.toString(),
      currency: data.currency as Currency,
      user: userId,
      category: data.categoryId || null,
    });

    this.em.persist(target);
    await this.em.flush();
    this.logger.log({ targetId: target.id }, 'Budget target created');

    return target;
  }

  async update(id: string, data: Partial<CreateBudgetTargetInput>): Promise<BudgetTarget> {
    const target = await this.findById(id);

    const updateData: Partial<BudgetTarget> = {};
    if (data.categoryId !== undefined) updateData.category = data.categoryId || null;
    if (data.month !== undefined) updateData.month = data.month;
    if (data.year !== undefined) updateData.year = data.year;
    if (data.targetAmount !== undefined) updateData.targetAmount = data.targetAmount.toString();
    if (data.currency !== undefined) updateData.currency = data.currency as Currency;
    if (data.type !== undefined) updateData.type = data.type;

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
}
