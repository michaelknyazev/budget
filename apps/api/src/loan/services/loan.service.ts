import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Loan } from '../entities/loan.entity';
import { Transaction } from '@/transaction/entities/transaction.entity';
import { CreateLoanInput, UpdateLoanInput, Currency, TransactionType } from '@budget/schemas';

@Injectable()
export class LoanService {
  private readonly logger = new Logger(LoanService.name);

  constructor(private readonly em: EntityManager) {}

  async findAll(userId: string): Promise<Loan[]> {
    return this.em.find(Loan, { user: userId }, { orderBy: { createdAt: 'DESC' } });
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

  /**
   * Walk all LOAN_DISBURSEMENT transactions that have no linked Loan entity,
   * auto-create a Loan for each, and link the transaction.
   */
  async recalculateFromTransactions(userId: string): Promise<number> {
    const disbursements = await this.em.find(Transaction, {
      user: userId,
      type: TransactionType.LOAN_DISBURSEMENT,
      loan: null,
    } as any);

    let created = 0;
    for (const tx of disbursements) {
      const amount = parseFloat(tx.amount);
      const dateStr = tx.date instanceof Date
        ? tx.date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const amountStr = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
      }).format(amount);

      const loan = await this.create(
        {
          title: `Loan ${tx.currency} ${amountStr} (${dateStr})`,
          amountLeft: amount,
          monthlyPayment: 0,
          currency: tx.currency as Currency,
          holder: 'Auto-created',
          loanNumber: null,
        },
        userId,
      );

      this.em.assign(tx, { loan: loan.id });
      created++;
    }

    if (created > 0) {
      await this.em.flush();
    }

    this.logger.log({ userId, created }, 'Recalculated loans from transactions');
    return created;
  }
}
