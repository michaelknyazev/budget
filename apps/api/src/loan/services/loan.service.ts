import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Loan } from '../entities/loan.entity';
import { Transaction } from '@/transaction/entities/transaction.entity';
import { CreateLoanInput, UpdateLoanInput, Currency, TransactionType } from '@budget/schemas';
import { extractLoanNumber } from '@/bank-import/utils/loan-number.util';

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

  async findByLoanNumber(loanNumber: string): Promise<Loan | null> {
    return this.em.findOne(Loan, { loanNumber });
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
    if (data.isRepaid !== undefined) updateData.isRepaid = data.isRepaid;

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
   * Full reset-and-rematch: clears all repayment/interest linkages and loan
   * state, then cleanly re-links using greedy zip by (currency, amount).
   * Idempotent — safe to re-run at any time.
   */
  async linkUnlinkedRepayments(userId: string) {
    const allLoans = await this.em.find(Loan, { user: userId });

    const disbursements = await this.em.find(
      Transaction,
      { user: userId, type: TransactionType.LOAN_DISBURSEMENT, loan: { $ne: null } },
      { orderBy: { date: 'ASC' }, populate: ['loan'] },
    );

    const repayments = await this.em.find(
      Transaction,
      { user: userId, type: TransactionType.LOAN_REPAYMENT },
      { orderBy: { date: 'ASC' } },
    );

    const interestTxs = await this.em.find(
      Transaction,
      { user: userId, type: TransactionType.LOAN_INTEREST },
      { orderBy: { date: 'ASC' } },
    );

    // ── Step 1: Full reset ──────────────────────────────────────
    const loanOriginalAmount = new Map<string, string>();
    for (const d of disbursements) {
      const loan = d.loan as Loan;
      loanOriginalAmount.set(loan.id, d.amount);
    }

    for (const loan of allLoans) {
      loan.isRepaid = false;
      loan.loanNumber = null as any;
      loan.amountLeft = loanOriginalAmount.get(loan.id) ?? loan.amountLeft;
    }

    for (const r of repayments) {
      this.em.assign(r, { loan: null });
    }
    for (const tx of interestTxs) {
      this.em.assign(tx, { loan: null });
    }

    await this.em.flush();

    // ── Step 2: Group by (currency, amount) ─────────────────────
    const disbursementGroups = new Map<string, Transaction[]>();
    for (const d of disbursements) {
      const key = `${d.currency}|${d.amount}`;
      if (!disbursementGroups.has(key)) disbursementGroups.set(key, []);
      disbursementGroups.get(key)!.push(d);
    }

    const repaymentGroups = new Map<string, Transaction[]>();
    for (const r of repayments) {
      const key = `${r.currency}|${r.amount}`;
      if (!repaymentGroups.has(key)) repaymentGroups.set(key, []);
      repaymentGroups.get(key)!.push(r);
    }

    // ── Step 3: Zip 1-to-1, link repayment → loan, mark repaid ─
    let repaymentsLinked = 0;
    for (const [key, disbs] of disbursementGroups) {
      const reps = repaymentGroups.get(key) || [];
      const pairCount = Math.min(disbs.length, reps.length);

      for (let i = 0; i < pairCount; i++) {
        const disbTx = disbs[i]!;
        const repTx = reps[i]!;
        const loan = disbTx.loan as Loan;

        const loanNumber = extractLoanNumber(repTx.rawDetails);
        if (loanNumber) {
          loan.loanNumber = loanNumber;
        }

        this.em.assign(repTx, { loan: loan.id });
        repaymentsLinked++;

        loan.isRepaid = true;
        loan.amountLeft = '0.00';
      }
    }

    await this.em.flush();

    // ── Step 4: Link LOAN_INTEREST by stored loanNumber ─────────
    let interestLinked = 0;
    for (const tx of interestTxs) {
      const loanNumber = extractLoanNumber(tx.rawDetails);
      if (!loanNumber) continue;

      const loan = await this.findByLoanNumber(loanNumber);
      if (loan) {
        this.em.assign(tx, { loan: loan.id });
        interestLinked++;
      }
    }

    await this.em.flush();

    const updatedLoans = await this.findAll(userId);
    const loansStillUnpaid = updatedLoans.filter((l) => !l.isRepaid).length;

    this.logger.log(
      { userId, repaymentsLinked, interestLinked, loansStillUnpaid },
      'Linked loan repayments and interest transactions',
    );

    return { repaymentsLinked, interestLinked, loansStillUnpaid };
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
