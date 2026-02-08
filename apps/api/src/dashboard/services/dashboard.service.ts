import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Transaction } from '@/transaction/entities/transaction.entity';
import {
  REAL_INCOME_TYPES,
  REAL_EXPENSE_TYPES,
  LOAN_COST_TYPES,
  TransactionType,
} from '@budget/schemas';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly em: EntityManager) {}

  async getMonthlySummary(
    userId: string,
    month: number,
    year: number,
    displayCurrency: string,
  ) {
    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of the month

    // Query transactions for the month/year and user
    const transactions = await this.em.find(
      Transaction,
      {
        user: userId,
        date: {
          $gte: startDate,
          $lte: endDate,
        },
      },
      {
        populate: ['category'],
      },
    );

    // Group by financial reporting groups
    let grossIncome = 0;
    let totalExpenses = 0;
    let loanCost = 0;
    const categoryTotals = new Map<string, { name: string; amount: number }>();

    for (const transaction of transactions) {
      const amount = parseFloat(transaction.amount);
      const type = transaction.type as TransactionType;

      // Real income
      if (REAL_INCOME_TYPES.includes(type)) {
        grossIncome += amount;
      }

      // Real expenses
      if (REAL_EXPENSE_TYPES.includes(type)) {
        totalExpenses += amount;
      }

      // Loan cost
      if (LOAN_COST_TYPES.includes(type)) {
        loanCost += amount;
      }

      // Track top categories (for expenses)
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

    // Calculate net income
    const netIncome = grossIncome - totalExpenses - loanCost;

    // Get top categories (sorted by amount, descending)
    const topCategories = Array.from(categoryTotals.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return {
      grossIncome,
      totalExpenses,
      loanCost,
      netIncome,
      transactionCount: transactions.length,
      topCategories,
    };
  }
}
