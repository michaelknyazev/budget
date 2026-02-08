import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Deposit } from '../entities/deposit.entity';
import { CreateDepositInput, UpdateDepositInput, Currency } from '@budget/schemas';

@Injectable()
export class DepositService {
  private readonly logger = new Logger(DepositService.name);

  constructor(private readonly em: EntityManager) {}

  async findAll(userId: string): Promise<Deposit[]> {
    return this.em.find(Deposit, { user: userId });
  }

  async findById(id: string): Promise<Deposit> {
    const deposit = await this.em.findOne(Deposit, { id });
    if (!deposit) {
      throw new NotFoundException({ message: 'Deposit not found', id });
    }
    return deposit;
  }

  async findActiveByCurrency(userId: string, currency: Currency): Promise<Deposit | null> {
    return this.em.findOne(Deposit, { user: userId, currency, isActive: true });
  }

  async create(data: CreateDepositInput, userId: string): Promise<Deposit> {
    const deposit = this.em.create(Deposit, {
      title: data.title,
      balance: data.balance.toString(),
      currency: data.currency as Currency,
      annualRate: data.annualRate != null ? data.annualRate.toString() : null,
      effectiveRate: data.effectiveRate != null ? data.effectiveRate.toString() : null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      maturityDate: data.maturityDate ? new Date(data.maturityDate) : null,
      bankAccount: data.bankAccountId || null,
      isActive: data.isActive ?? true,
      user: userId,
    });

    this.em.persist(deposit);
    await this.em.flush();
    this.logger.log({ depositId: deposit.id }, 'Deposit created');

    return deposit;
  }

  async update(id: string, data: UpdateDepositInput): Promise<Deposit> {
    const deposit = await this.findById(id);

    const updateData: Partial<Deposit> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.balance !== undefined) updateData.balance = data.balance.toString();
    if (data.currency !== undefined) updateData.currency = data.currency as Currency;
    if (data.annualRate !== undefined)
      updateData.annualRate = data.annualRate != null ? data.annualRate.toString() : null;
    if (data.effectiveRate !== undefined)
      updateData.effectiveRate = data.effectiveRate != null ? data.effectiveRate.toString() : null;
    if (data.startDate !== undefined)
      updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    if (data.maturityDate !== undefined)
      updateData.maturityDate = data.maturityDate ? new Date(data.maturityDate) : null;
    if (data.bankAccountId !== undefined)
      updateData.bankAccount = data.bankAccountId || null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    this.em.assign(deposit, updateData);
    await this.em.flush();
    this.logger.log({ depositId: id }, 'Deposit updated');

    return deposit;
  }

  async addToBalance(id: string, amount: number): Promise<Deposit> {
    const deposit = await this.findById(id);
    const currentBalance = parseFloat(deposit.balance);
    deposit.balance = (currentBalance + amount).toFixed(2);
    await this.em.flush();
    this.logger.log(
      { depositId: id, added: amount, newBalance: deposit.balance },
      'Deposit balance updated',
    );
    return deposit;
  }

  async delete(id: string): Promise<void> {
    const deposit = await this.findById(id);
    await this.em.removeAndFlush(deposit);
    this.logger.log({ depositId: id }, 'Deposit deleted');
  }
}
