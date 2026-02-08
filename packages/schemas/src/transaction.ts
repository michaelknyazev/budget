import { z } from 'zod';
import { CurrencyEnum, TransactionTypeEnum } from './enums';

export const CreateTransactionSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(500)
    .describe('Transaction title or merchant name'),
  amount: z
    .number()
    .positive()
    .multipleOf(0.01)
    .describe('Amount (always positive)'),
  currency: CurrencyEnum.describe('Transaction currency'),
  type: TransactionTypeEnum.describe('Transaction type'),
  categoryId: z.string().uuid().nullable().optional().describe('Category ID'),
  date: z.string().date().describe('Transaction date (YYYY-MM-DD)'),
  merchantName: z
    .string()
    .max(200)
    .nullable()
    .optional()
    .describe('Merchant name'),
  merchantLocation: z
    .string()
    .max(500)
    .nullable()
    .optional()
    .describe('Merchant location'),
  mccCode: z
    .number()
    .int()
    .min(0)
    .max(9999)
    .nullable()
    .optional()
    .describe('Merchant Category Code'),
});

export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;

export const UpdateTransactionSchema = CreateTransactionSchema.partial();
export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>;

export const QueryTransactionsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  month: z.coerce
    .number()
    .int()
    .min(1)
    .max(12)
    .optional()
    .describe('Filter by month'),
  year: z.coerce
    .number()
    .int()
    .min(2020)
    .max(2100)
    .optional()
    .describe('Filter by year'),
  currency: CurrencyEnum.optional().describe('Filter by currency'),
  type: TransactionTypeEnum.optional().describe('Filter by transaction type'),
  categoryId: z.string().uuid().optional().describe('Filter by category'),
  merchantName: z.string().optional().describe('Search by merchant name'),
  mccCode: z.coerce
    .number()
    .int()
    .optional()
    .describe('Filter by MCC code'),
});

export type QueryTransactionsInput = z.infer<typeof QueryTransactionsSchema>;

export const TransactionResponseSchema = z.object({
  id: z.string().uuid().describe('Transaction ID'),
  title: z.string().describe('Transaction title'),
  amount: z.number().describe('Amount (always positive)'),
  currency: CurrencyEnum,
  type: TransactionTypeEnum,
  date: z.string().date(),
  postingDate: z.string().date().nullable(),
  merchantName: z.string().nullable(),
  merchantLocation: z.string().nullable(),
  mccCode: z.number().int().nullable(),
  cardLastFour: z.string().nullable(),
  rawDetails: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  categoryId: z.string().uuid().nullable(),
  bankImportId: z.string().uuid().nullable(),
  importHash: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type TransactionResponse = z.infer<typeof TransactionResponseSchema>;
