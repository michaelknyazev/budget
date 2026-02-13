import { z } from 'zod';
import { CurrencyEnum } from './enums';

// ────────────────────────────────────────────────────────────────
// Create / Update
// ────────────────────────────────────────────────────────────────

export const CreateBudgetTargetSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(200)
    .describe('Planned expense name (e.g. Family, Rent, Groceries)'),
  categoryId: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .describe('Category for auto-matching actuals (null = manual tracking)'),
  month: z.number().int().min(1).max(12).describe('Target month'),
  year: z.number().int().min(2020).max(2100).describe('Target year'),
  targetAmount: z
    .number()
    .positive()
    .multipleOf(0.01)
    .describe('Planned amount'),
  currency: CurrencyEnum.describe('Target currency'),
});

export type CreateBudgetTargetInput = z.infer<typeof CreateBudgetTargetSchema>;

export const UpdateBudgetTargetSchema = CreateBudgetTargetSchema.partial();
export type UpdateBudgetTargetInput = z.infer<typeof UpdateBudgetTargetSchema>;

// ────────────────────────────────────────────────────────────────
// Query
// ────────────────────────────────────────────────────────────────

export const QueryBudgetTargetSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100),
});

export type QueryBudgetTargetInput = z.infer<typeof QueryBudgetTargetSchema>;

// ────────────────────────────────────────────────────────────────
// Comparison (planned vs actual)
// ────────────────────────────────────────────────────────────────

export const QueryBudgetTargetComparisonSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100),
  currency: CurrencyEnum.default('USD').describe('Display currency'),
});

export type QueryBudgetTargetComparisonInput = z.infer<
  typeof QueryBudgetTargetComparisonSchema
>;

export const BudgetTargetComparisonItemSchema = z.object({
  budgetTargetId: z.string().uuid(),
  name: z.string(),
  categoryName: z.string().nullable(),
  plannedAmount: z.number(),
  actualAmount: z.number(),
  plannedCurrency: z.string(),
  convertedPlannedAmount: z.number(),
  convertedActualAmount: z.number(),
  status: z.enum(['paid', 'partial', 'pending']),
  linkedTransactionCount: z.number(),
});

export type BudgetTargetComparisonItem = z.infer<
  typeof BudgetTargetComparisonItemSchema
>;

export const BudgetTargetComparisonResponseSchema = z.object({
  month: z.number(),
  year: z.number(),
  currency: z.string(),
  items: z.array(BudgetTargetComparisonItemSchema),
  totalPlanned: z.number(),
  totalActual: z.number(),
});

export type BudgetTargetComparisonResponse = z.infer<
  typeof BudgetTargetComparisonResponseSchema
>;
