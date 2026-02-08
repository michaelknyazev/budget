import { z } from 'zod';
import { CurrencyEnum } from './enums';

export const CreateBudgetTargetSchema = z.object({
  categoryId: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .describe('Category (null = total target)'),
  month: z.number().int().min(1).max(12).describe('Target month'),
  year: z.number().int().min(2020).max(2100).describe('Target year'),
  targetAmount: z
    .number()
    .positive()
    .multipleOf(0.01)
    .describe('Planned amount'),
  currency: CurrencyEnum.describe('Target currency'),
  type: z
    .enum(['EXPENSE', 'INCOME'])
    .describe('Spending limit or income goal'),
});

export type CreateBudgetTargetInput = z.infer<typeof CreateBudgetTargetSchema>;

export const UpdateBudgetTargetSchema = CreateBudgetTargetSchema.partial();
export type UpdateBudgetTargetInput = z.infer<typeof UpdateBudgetTargetSchema>;

export const QueryBudgetTargetSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100),
});

export type QueryBudgetTargetInput = z.infer<typeof QueryBudgetTargetSchema>;
