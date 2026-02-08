import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { BankAccount } from '../entities/bank-account.entity';
import { CreateBankAccountInput, UpdateBankAccountInput, AccountType } from '@budget/schemas';

@Injectable()
export class BankAccountService {
  private readonly logger = new Logger(BankAccountService.name);

  constructor(private readonly em: EntityManager) {}

  async findAll(userId: string): Promise<BankAccount[]> {
    return this.em.find(BankAccount, { user: userId });
  }

  async findById(id: string): Promise<BankAccount> {
    const account = await this.em.findOne(BankAccount, { id });
    if (!account) {
      throw new NotFoundException({ message: 'Bank account not found', id });
    }
    return account;
  }

  async create(data: CreateBankAccountInput, userId: string): Promise<BankAccount> {
    const account = this.em.create(BankAccount, {
      ...data,
      accountType: data.accountType as AccountType,
      interestRate: data.interestRate?.toString() || null,
      effectiveRate: data.effectiveRate?.toString() || null,
      user: userId,
    });

    this.em.persist(account);
    await this.em.flush();
    this.logger.log({ accountId: account.id }, 'Bank account created');

    return account;
  }

  async update(id: string, data: UpdateBankAccountInput): Promise<BankAccount> {
    const account = await this.findById(id);

    const updateData: Partial<BankAccount> = {};
    if (data.iban !== undefined) updateData.iban = data.iban;
    if (data.bankName !== undefined) updateData.bankName = data.bankName;
    if (data.bankCode !== undefined) updateData.bankCode = data.bankCode;
    if (data.accountOwner !== undefined) updateData.accountOwner = data.accountOwner;
    if (data.accountType !== undefined) updateData.accountType = data.accountType as AccountType;
    if (data.interestRate !== undefined)
      updateData.interestRate = data.interestRate?.toString() || null;
    if (data.effectiveRate !== undefined)
      updateData.effectiveRate = data.effectiveRate?.toString() || null;

    this.em.assign(account, updateData);
    await this.em.flush();
    this.logger.log({ accountId: id }, 'Bank account updated');

    return account;
  }

  async delete(id: string): Promise<void> {
    const account = await this.findById(id);
    await this.em.removeAndFlush(account);
    this.logger.log({ accountId: id }, 'Bank account deleted');
  }
}
