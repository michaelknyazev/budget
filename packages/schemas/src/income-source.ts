import { z } from 'zod';
import { CurrencyEnum } from './enums';

export const CreateIncomeSourceSchema = z.object({
  name: z.string().min(1).max(200).describe('Income source name'),
  currency: CurrencyEnum,
  defaultAmount: z
    .number()
    .positive()
    .multipleOf(0.01)
    .nullable()
    .optional()
    .describe('Expected monthly amount'),
  isActive: z.boolean().default(true),
});

export type CreateIncomeSourceInput = z.infer<typeof CreateIncomeSourceSchema>;

export const UpdateIncomeSourceSchema = CreateIncomeSourceSchema.partial();
export type UpdateIncomeSourceInput = z.infer<typeof UpdateIncomeSourceSchema>;
