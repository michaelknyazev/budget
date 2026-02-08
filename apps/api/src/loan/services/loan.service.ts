import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Loan } from '../entities/loan.entity';
import { CreateLoanInput, UpdateLoanInput, Currency } from '@budget/schemas';

@Injectable()
export class LoanService {
  private readonly logger = new Logger(LoanService.name);

  constructor(private readonly em: EntityManager) {}

  async findAll(userId: string): Promise<Loan[]> {
    return this.em.find(Loan, { user: userId });
  }

  async findById(id: string): Promise<Loan> {
    const loan = await this.em.findOne(Loan, { id });
    if (!loan) {
      throw new NotFoundException({ message: 'Loan not found', id });
    }
    return loan;
  }

  async create(data: CreateLoanInput, userId: string): Promise<Loan> {
    const loan = this.em.create(Loan, {
      ...data,
      amountLeft: data.amountLeft.toString(),
      monthlyPayment: data.monthlyPayment.toString(),
      currency: data.currency as Currency,
      user: userId,
    });

    this.em.persist(loan);
    await this.em.flush();
    this.logger.log({ loanId: loan.id }, 'Loan created');

    return loan;
  }

  async update(id: string, data: UpdateLoanInput): Promise<Loan> {
    const loan = await this.findById(id);

    const updateData: Partial<Loan> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.amountLeft !== undefined) updateData.amountLeft = data.amountLeft.toString();
    if (data.monthlyPayment !== undefined)
      updateData.monthlyPayment = data.monthlyPayment.toString();
    if (data.currency !== undefined) updateData.currency = data.currency as Currency;
    if (data.holder !== undefined) updateData.holder = data.holder;
    if (data.loanNumber !== undefined) updateData.loanNumber = data.loanNumber;

    this.em.assign(loan, updateData);
    await this.em.flush();
    this.logger.log({ loanId: id }, 'Loan updated');

    return loan;
  }

  async delete(id: string): Promise<void> {
    const loan = await this.findById(id);
    await this.em.removeAndFlush(loan);
    this.logger.log({ loanId: id }, 'Loan deleted');
  }
}
