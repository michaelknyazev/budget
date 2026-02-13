import { z } from 'zod';
import { CurrencyEnum } from './enums';

// ────────────────────────────────────────────────────────────────
// Create / Update
// ────────────────────────────────────────────────────────────────

export const CreatePlannedIncomeSchema = z.object({
  incomeSourceId: z
    .string()
    .uuid()
    .describe('Income source to plan for'),
  month: z.number().int().min(1).max(12).describe('Target month'),
  year: z.number().int().min(2020).max(2100).describe('Target year'),
  plannedAmount: z
    .number()
    .positive()
    .multipleOf(0.01)
    .describe('Planned amount in source currency'),
  notes: z
    .string()
    .max(500)
    .nullable()
    .optional()
    .describe('Optional memo'),
});

export type CreatePlannedIncomeInput = z.infer<
  typeof CreatePlannedIncomeSchema
>;

export const UpdatePlannedIncomeSchema = CreatePlannedIncomeSchema.partial();
export type UpdatePlannedIncomeInput = z.infer<
  typeof UpdatePlannedIncomeSchema
>;

// ────────────────────────────────────────────────────────────────
// Query
// ────────────────────────────────────────────────────────────────

export const QueryPlannedIncomeSchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2020).max(2100),
});

export type QueryPlannedIncomeInput = z.infer<
  typeof QueryPlannedIncomeSchema
>;

// ────────────────────────────────────────────────────────────────
// Comparison (planned vs actual)
// ────────────────────────────────────────────────────────────────

export const QueryPlannedIncomeComparisonSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100),
  currency: CurrencyEnum.default('USD').describe('Display currency'),
});

export type QueryPlannedIncomeComparisonInput = z.infer<
  typeof QueryPlannedIncomeComparisonSchema
>;

export const PlannedIncomeComparisonItemSchema = z.object({
  plannedIncomeId: z.string().uuid(),
  incomeSourceId: z.string().uuid(),
  incomeSourceName: z.string(),
  plannedAmount: z.number(),
  actualAmount: z.number(),
  plannedCurrency: z.string(),
  convertedPlannedAmount: z.number(),
  convertedActualAmount: z.number(),
  status: z.enum(['received', 'partial', 'pending']),
  linkedTransactionCount: z.number(),
});

export type PlannedIncomeComparisonItem = z.infer<
  typeof PlannedIncomeComparisonItemSchema
>;

export const PlannedIncomeComparisonResponseSchema = z.object({
  month: z.number(),
  year: z.number(),
  currency: z.string(),
  items: z.array(PlannedIncomeComparisonItemSchema),
  totalPlanned: z.number(),
  totalActual: z.number(),
});

export type PlannedIncomeComparisonResponse = z.infer<
  typeof PlannedIncomeComparisonResponseSchema
>;
