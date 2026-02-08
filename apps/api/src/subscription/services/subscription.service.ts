import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Subscription } from '../entities/subscription.entity';
import { CreateSubscriptionInput, UpdateSubscriptionInput, Currency } from '@budget/schemas';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(private readonly em: EntityManager) {}

  async findAll(userId: string): Promise<Subscription[]> {
    return this.em.find(Subscription, { user: userId }, { populate: ['category'] });
  }

  async findById(id: string): Promise<Subscription> {
    const subscription = await this.em.findOne(Subscription, { id }, { populate: ['category'] });
    if (!subscription) {
      throw new NotFoundException({ message: 'Subscription not found', id });
    }
    return subscription;
  }

  async create(data: CreateSubscriptionInput, userId: string): Promise<Subscription> {
    const subscription = this.em.create(Subscription, {
      ...data,
      amount: data.amount.toString(),
      currency: data.currency as Currency,
      user: userId,
      category: data.categoryId || null,
    });

    this.em.persist(subscription);
    await this.em.flush();
    this.logger.log({ subscriptionId: subscription.id }, 'Subscription created');

    return subscription;
  }

  async update(id: string, data: UpdateSubscriptionInput): Promise<Subscription> {
    const subscription = await this.findById(id);

    const updateData: Partial<Subscription> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.amount !== undefined) updateData.amount = data.amount.toString();
    if (data.currency !== undefined) updateData.currency = data.currency as Currency;
    if (data.dayOfMonth !== undefined) updateData.dayOfMonth = data.dayOfMonth;
    if (data.owner !== undefined) updateData.owner = data.owner;
    if (data.categoryId !== undefined) updateData.category = data.categoryId || null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    this.em.assign(subscription, updateData);
    await this.em.flush();
    this.logger.log({ subscriptionId: id }, 'Subscription updated');

    return subscription;
  }

  async delete(id: string): Promise<void> {
    const subscription = await this.findById(id);
    await this.em.removeAndFlush(subscription);
    this.logger.log({ subscriptionId: id }, 'Subscription deleted');
  }
}
