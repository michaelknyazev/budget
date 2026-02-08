import { z } from 'zod';
import { CurrencyEnum } from './enums';

export const QueryMonthlySummarySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2100),
  currency: CurrencyEnum.default('USD').describe('Display currency'),
});

export type QueryMonthlySummaryInput = z.infer<
  typeof QueryMonthlySummarySchema
>;
