import { z } from 'zod';
import { CurrencyEnum, ExchangeRateSourceEnum } from './enums';

export const ExchangeRateSchema = z.object({
  currency: CurrencyEnum.describe('Currency code'),
  rateToGel: z
    .number()
    .positive()
    .describe('GEL per 1 unit of currency'),
  quantity: z
    .number()
    .int()
    .positive()
    .describe('NBG quantity (1 for USD, 100 for RUB)'),
  rawRate: z.number().positive().describe('Raw NBG rate'),
  date: z.string().date().describe('Rate date'),
  source: ExchangeRateSourceEnum.describe('Rate source'),
});

export type ExchangeRateInput = z.infer<typeof ExchangeRateSchema>;

export const QueryExchangeRateSchema = z.object({
  currency: CurrencyEnum.describe('Currency code'),
  date: z.string().date().describe('Rate date'),
});

export type QueryExchangeRateInput = z.infer<typeof QueryExchangeRateSchema>;
