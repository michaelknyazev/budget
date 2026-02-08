import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Transaction } from '@/transaction/entities/transaction.entity';
import { ExchangeRateService } from '@/exchange-rate/services/exchange-rate.service';
import { SubscriptionService } from '@/subscription/services/subscription.service';
import { LoanService } from '@/loan/services/loan.service';
import { PlannedIncomeService } from '@/planned-income/services/planned-income.service';
import {
  Currency,
  REAL_INCOME_TYPES,
  REAL_EXPENSE_TYPES,
  LOAN_COST_TYPES,
  TransactionType,
} from '@budget/schemas';
import type {
  YearlySummaryResponse,
  YearlyMonthData,
  MonthlyReportResponse,
} from '@budget/schemas';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly exchangeRateService: ExchangeRateService,
    private readonly subscriptionService: SubscriptionService,
    private readonly loanService: LoanService,
    private readonly plannedIncomeService: PlannedIncomeService,
  ) {}

  // ────────────────────────────────────────────────────────────────
  // Monthly Summary (existing, now with currency conversion)
  // ────────────────────────────────────────────────────────────────

  async getMonthlySummary(
    userId: string,
    month: number,
    year: number,
    displayCurrency: string,
  ) {
    const { startDate, endDate } = this.getMonthRange(month, year);

    const transactions = await this.em.find(
      Transaction,
      {
        user: userId,
        date: { $gte: startDate, $lte: endDate },
      },
      { populate: ['category'] },
    );

    let grossIncome = 0;
    let totalExpenses = 0;
    let loanCost = 0;
    const categoryTotals = new Map<string, { name: string; amount: number }>();

    for (const transaction of transactions) {
      const rawAmount = parseFloat(transaction.amount);
      const type = transaction.type as TransactionType;
      const amount = await this.convert(
        rawAmount,
        transaction.currency,
        displayCurrency,
        transaction.date,
      );

      if (REAL_INCOME_TYPES.includes(type)) {
        grossIncome += amount;
      }

      if (REAL_EXPENSE_TYPES.includes(type)) {
        totalExpenses += amount;
      }

      if (LOAN_COST_TYPES.includes(type)) {
        loanCost += amount;
      }

      if (REAL_EXPENSE_TYPES.includes(type) && transaction.category) {
        const categoryId = transaction.category.id;
        const existing = categoryTotals.get(categoryId) || {
          name: transaction.category.name,
          amount: 0,
        };
        existing.amount += amount;
        categoryTotals.set(categoryId, existing);
      }
    }

    const netIncome = grossIncome - totalExpenses - loanCost;

    const topCategories = Array.from(categoryTotals.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return {
      grossIncome: this.round(grossIncome),
      totalExpenses: this.round(totalExpenses),
      loanCost: this.round(loanCost),
      netIncome: this.round(netIncome),
      transactionCount: transactions.length,
      topCategories: topCategories.map((c) => ({
        name: c.name,
        amount: this.round(c.amount),
      })),
    };
  }

  // ────────────────────────────────────────────────────────────────
  // Yearly Summary
  // ────────────────────────────────────────────────────────────────

  async getYearlySummary(
    userId: string,
    year: number,
    displayCurrency: string,
  ): Promise<YearlySummaryResponse> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    const transactions = await this.em.find(Transaction, {
      user: userId,
      date: { $gte: startDate, $lte: endDate },
    });

    // Initialize 12 month buckets
    const monthBuckets: Array<{
      grossIncome: number;
      totalExpenses: number;
      loanCost: number;
      expensesByCurrency: Record<string, number>;
    }> = Array.from({ length: 12 }, () => ({
      grossIncome: 0,
      totalExpenses: 0,
      loanCost: 0,
      expensesByCurrency: {
        USD: 0,
        GEL: 0,
        RUB: 0,
        EUR: 0,
        GBP: 0,
      },
    }));

    for (const transaction of transactions) {
      const rawAmount = parseFloat(transaction.amount);
      const type = transaction.type as TransactionType;
      const txDate = transaction.date instanceof Date ? transaction.date : new Date(transaction.date);
      const monthIdx = txDate.getMonth(); // 0-based

      const convertedAmount = await this.convert(
        rawAmount,
        transaction.currency,
        displayCurrency,
        txDate,
      );

      const bucket = monthBuckets[monthIdx];
      if (!bucket) continue;

      if (REAL_INCOME_TYPES.includes(type)) {
        bucket.grossIncome += convertedAmount;
      }

      if (REAL_EXPENSE_TYPES.includes(type)) {
        bucket.totalExpenses += convertedAmount;
        // Track in original currency
        const cur = transaction.currency as string;
        if (cur in bucket.expensesByCurrency) {
          bucket.expensesByCurrency[cur] =
            (bucket.expensesByCurrency[cur] ?? 0) + rawAmount;
        }
      }

      if (LOAN_COST_TYPES.includes(type)) {
        bucket.loanCost += convertedAmount;
      }
    }

    const months: YearlyMonthData[] = monthBuckets.map((bucket, idx) => {
      const netIncome =
        bucket.grossIncome - bucket.totalExpenses - bucket.loanCost;
      return {
        month: idx + 1,
        grossIncome: this.round(bucket.grossIncome),
        totalExpenses: this.round(bucket.totalExpenses),
        loanCost: this.round(bucket.loanCost),
        netIncome: this.round(netIncome),
        expensesByCurrency: Object.fromEntries(
          Object.entries(bucket.expensesByCurrency).map(([k, v]) => [
            k,
            this.round(v),
          ]),
        ) as Record<string, number>,
      };
    });

    const totals = {
      grossIncome: this.round(months.reduce((s, m) => s + m.grossIncome, 0)),
      totalExpenses: this.round(
        months.reduce((s, m) => s + m.totalExpenses, 0),
      ),
      loanCost: this.round(months.reduce((s, m) => s + m.loanCost, 0)),
      netIncome: this.round(months.reduce((s, m) => s + m.netIncome, 0)),
    };

    // Cumulative savings: each month = previous + netIncome[month]
    const cumulativeSavings: number[] = [];
    let running = 0;
    for (const m of months) {
      running += m.netIncome;
      cumulativeSavings.push(this.round(running));
    }

    return {
      year,
      currency: displayCurrency,
      months,
      totals,
      cumulativeSavings,
    };
  }

  // ────────────────────────────────────────────────────────────────
  // Monthly Report (rich detail)
  // ────────────────────────────────────────────────────────────────

  async getMonthlyReport(
    userId: string,
    month: number,
    year: number,
    displayCurrency: string,
  ): Promise<MonthlyReportResponse> {
    const { startDate, endDate } = this.getMonthRange(month, year);

    const transactions = await this.em.find(
      Transaction,
      {
        user: userId,
        date: { $gte: startDate, $lte: endDate },
      },
      { populate: ['category', 'incomeSource'] },
    );

    // Summary aggregation
    let grossIncome = 0;
    let totalExpenses = 0;
    let loanCost = 0;

    // Expenses grouped by original currency
    const expenseCurrencyMap = new Map<
      string,
      { original: number; converted: number }
    >();

    // Income by source (income source name or category or 'Uncategorized')
    const incomeSourceMap = new Map<
      string,
      {
        converted: number;
        originalAmount: number;
        originalCurrency: string;
      }
    >();

    // Top categories for expenses
    const categoryTotals = new Map<string, { name: string; amount: number }>();

    for (const transaction of transactions) {
      const rawAmount = parseFloat(transaction.amount);
      const type = transaction.type as TransactionType;
      const convertedAmount = await this.convert(
        rawAmount,
        transaction.currency,
        displayCurrency,
        transaction.date,
      );

      if (REAL_INCOME_TYPES.includes(type)) {
        grossIncome += convertedAmount;

        // Track income by source (prefer linked IncomeSource, fall back to category)
        const sourceName =
          transaction.incomeSource?.name ??
          transaction.category?.name ??
          'Uncategorized';
        const existing = incomeSourceMap.get(sourceName);
        if (existing) {
          existing.converted += convertedAmount;
          existing.originalAmount += rawAmount;
        } else {
          incomeSourceMap.set(sourceName, {
            converted: convertedAmount,
            originalAmount: rawAmount,
            originalCurrency: transaction.currency,
          });
        }
      }

      if (REAL_EXPENSE_TYPES.includes(type)) {
        totalExpenses += convertedAmount;

        // Track expenses by currency
        const cur = transaction.currency;
        const entry = expenseCurrencyMap.get(cur) || {
          original: 0,
          converted: 0,
        };
        entry.original += rawAmount;
        entry.converted += convertedAmount;
        expenseCurrencyMap.set(cur, entry);

        // Track categories
        if (transaction.category) {
          const categoryId = transaction.category.id;
          const cat = categoryTotals.get(categoryId) || {
            name: transaction.category.name,
            amount: 0,
          };
          cat.amount += convertedAmount;
          categoryTotals.set(categoryId, cat);
        }
      }

      if (LOAN_COST_TYPES.includes(type)) {
        loanCost += convertedAmount;
      }
    }

    const netIncome = grossIncome - totalExpenses - loanCost;

    // Calculate previous months' savings (cumulative net income before this month)
    const previousSavings = await this.calculatePreviousSavings(
      userId,
      month,
      year,
      displayCurrency,
    );

    // Subscriptions total
    const subscriptions = await this.subscriptionService.findAll(userId);
    const activeSubscriptions = subscriptions.filter((s) => s.isActive);
    let subscriptionTotal = 0;
    for (const sub of activeSubscriptions) {
      subscriptionTotal += await this.convert(
        parseFloat(sub.amount),
        sub.currency,
        displayCurrency,
        new Date(year, month - 1, 15), // mid-month for rate
      );
    }

    // Loan summary
    const loans = await this.loanService.findAll(userId);
    let loanTotalRemaining = 0;
    let loanMonthlyPayment = 0;
    for (const loan of loans) {
      loanTotalRemaining += await this.convert(
        parseFloat(loan.amountLeft),
        loan.currency,
        displayCurrency,
        new Date(year, month - 1, 15),
      );
      loanMonthlyPayment += await this.convert(
        parseFloat(loan.monthlyPayment),
        loan.currency,
        displayCurrency,
        new Date(year, month - 1, 15),
      );
    }

    // Planned vs actual income comparison
    const comparison = await this.plannedIncomeService.getComparison(
      userId,
      month,
      year,
      displayCurrency,
    );

    // Build response
    const topCategories = Array.from(categoryTotals.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    const expensesByCurrency = Array.from(expenseCurrencyMap.entries())
      .map(([currency, data]) => ({
        currency,
        originalAmount: this.round(data.original),
        convertedAmount: this.round(data.converted),
      }))
      .sort((a, b) => b.convertedAmount - a.convertedAmount);

    const incomeBySource = Array.from(incomeSourceMap.entries())
      .map(([source, data]) => ({
        source,
        amount: this.round(data.converted),
        originalAmount: this.round(data.originalAmount),
        originalCurrency: data.originalCurrency,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      month,
      year,
      currency: displayCurrency,
      summary: {
        grossIncome: this.round(grossIncome),
        totalExpenses: this.round(totalExpenses),
        loanCost: this.round(loanCost),
        netIncome: this.round(netIncome),
        transactionCount: transactions.length,
      },
      savings: {
        previous: this.round(previousSavings),
        leftover: this.round(netIncome),
        total: this.round(previousSavings + netIncome),
      },
      expensesByCurrency,
      incomeBySource,
      topCategories: topCategories.map((c) => ({
        name: c.name,
        amount: this.round(c.amount),
      })),
      subscriptionTotal: this.round(subscriptionTotal),
      loanSummary: {
        totalRemaining: this.round(loanTotalRemaining),
        monthlyPayment: this.round(loanMonthlyPayment),
      },
      plannedIncome: comparison.items.length > 0 ? comparison.items : undefined,
    };
  }

  // ────────────────────────────────────────────────────────────────
  // Private helpers
  // ────────────────────────────────────────────────────────────────

  private async calculatePreviousSavings(
    userId: string,
    month: number,
    year: number,
    displayCurrency: string,
  ): Promise<number> {
    // Sum net income of all months before this one in the same year
    if (month <= 1) return 0;

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, month - 1, 0); // last day of prev month

    const transactions = await this.em.find(Transaction, {
      user: userId,
      date: { $gte: startDate, $lte: endDate },
    });

    let income = 0;
    let expenses = 0;
    let loanCostTotal = 0;

    for (const transaction of transactions) {
      const rawAmount = parseFloat(transaction.amount);
      const type = transaction.type as TransactionType;
      const convertedAmount = await this.convert(
        rawAmount,
        transaction.currency,
        displayCurrency,
        transaction.date,
      );

      if (REAL_INCOME_TYPES.includes(type)) income += convertedAmount;
      if (REAL_EXPENSE_TYPES.includes(type)) expenses += convertedAmount;
      if (LOAN_COST_TYPES.includes(type)) loanCostTotal += convertedAmount;
    }

    return income - expenses - loanCostTotal;
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
      // If no rate found, return unconverted amount with a warning
      this.logger.warn(
        { from, to, date: date.toISOString() },
        'Exchange rate not found, returning unconverted amount',
      );
      return amount;
    }
  }

  private getMonthRange(month: number, year: number) {
    return {
      startDate: new Date(year, month - 1, 1),
      endDate: new Date(year, month, 0),
    };
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
