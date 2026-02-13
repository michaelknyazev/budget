import { z } from 'zod';
import { CurrencyEnum } from './enums';

// ────────────────────────────────────────────────────────────────
// Monthly Summary (existing)
// ────────────────────────────────────────────────────────────────

export const QueryMonthlySummarySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100),
  currency: CurrencyEnum.default('USD').describe('Display currency'),
});

export type QueryMonthlySummaryInput = z.infer<
  typeof QueryMonthlySummarySchema
>;

// ────────────────────────────────────────────────────────────────
// Yearly Summary
// ────────────────────────────────────────────────────────────────

export const QueryYearlySummarySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  currency: CurrencyEnum.default('USD').describe('Display currency'),
});

export type QueryYearlySummaryInput = z.infer<typeof QueryYearlySummarySchema>;

export const YearlyMonthDataSchema = z.object({
  month: z.number().int().min(1).max(12),
  grossIncome: z.number(),
  totalExpenses: z.number(),
  loanCost: z.number(),
  netIncome: z.number(),
  plannedIncome: z.number(),
  plannedExpenses: z.number(),
  plannedNetIncome: z.number(),
  expensesByCurrency: z.record(CurrencyEnum, z.number()),
});

export type YearlyMonthData = z.infer<typeof YearlyMonthDataSchema>;

export const YearlySummaryResponseSchema = z.object({
  year: z.number(),
  currency: z.string(),
  months: z.array(YearlyMonthDataSchema),
  totals: z.object({
    grossIncome: z.number(),
    totalExpenses: z.number(),
    loanCost: z.number(),
    netIncome: z.number(),
    plannedIncome: z.number(),
    plannedExpenses: z.number(),
    plannedNetIncome: z.number(),
  }),
  /** Baseline before Jan 1 of this year: account starting balances + prior-year net income */
  startingBalance: z.number(),
  cumulativeSavings: z.array(z.number()),
  plannedCumulativeSavings: z.array(z.number()),
});

export type YearlySummaryResponse = z.infer<typeof YearlySummaryResponseSchema>;

// ────────────────────────────────────────────────────────────────
// Monthly Report (rich detail)
// ────────────────────────────────────────────────────────────────

export const QueryMonthlyReportSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100),
  currency: CurrencyEnum.default('USD').describe('Display currency'),
});

export type QueryMonthlyReportInput = z.infer<typeof QueryMonthlyReportSchema>;

export const ExpenseByCurrencySchema = z.object({
  currency: z.string(),
  originalAmount: z.number(),
  convertedAmount: z.number(),
});

export type ExpenseByCurrency = z.infer<typeof ExpenseByCurrencySchema>;

export const IncomeBySourceSchema = z.object({
  source: z.string(),
  amount: z.number(),
  originalAmount: z.number(),
  originalCurrency: z.string(),
});

export type IncomeBySource = z.infer<typeof IncomeBySourceSchema>;

export const MonthlyReportResponseSchema = z.object({
  month: z.number(),
  year: z.number(),
  currency: z.string(),
  summary: z.object({
    grossIncome: z.number(),
    totalExpenses: z.number(),
    loanCost: z.number(),
    netIncome: z.number(),
    transactionCount: z.number(),
  }),
  savings: z.object({
    previous: z.number(),
    leftover: z.number(),
    total: z.number(),
  }),
  expensesByCurrency: z.array(ExpenseByCurrencySchema),
  incomeBySource: z.array(IncomeBySourceSchema),
  topCategories: z.array(
    z.object({
      name: z.string(),
      amount: z.number(),
    }),
  ),
  subscriptionTotal: z.number(),
  loanSummary: z.object({
    totalRemaining: z.number(),
    monthlyPayment: z.number(),
  }),
  plannedIncome: z
    .array(
      z.object({
        incomeSourceId: z.string().uuid(),
        incomeSourceName: z.string(),
        plannedAmount: z.number(),
        actualAmount: z.number(),
        plannedCurrency: z.string(),
        convertedPlannedAmount: z.number(),
        convertedActualAmount: z.number(),
        status: z.enum(['received', 'partial', 'pending']),
      }),
    )
    .optional(),
  depositBalance: z.number().describe('Total deposit balance computed from DEPOSIT-type transactions'),
});

export type MonthlyReportResponse = z.infer<typeof MonthlyReportResponseSchema>;
