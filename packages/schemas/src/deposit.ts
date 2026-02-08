import { z } from 'zod';
import { CurrencyEnum } from './enums';

export const CreateDepositSchema = z.object({
  title: z.string().min(1).max(200).describe('Deposit name'),
  balance: z
    .number()
    .nonnegative()
    .multipleOf(0.01)
    .describe('Current deposit balance'),
  currency: CurrencyEnum,
  annualRate: z
    .number()
    .nonnegative()
    .multipleOf(0.01)
    .nullable()
    .optional()
    .describe('Annual interest rate (e.g. 10.30)'),
  effectiveRate: z
    .number()
    .nonnegative()
    .multipleOf(0.01)
    .nullable()
    .optional()
    .describe('Effective annual rate (e.g. 10.80)'),
  startDate: z.string().date().nullable().optional().describe('Deposit start date'),
  maturityDate: z.string().date().nullable().optional().describe('Deposit maturity date'),
  bankAccountId: z.string().uuid().nullable().optional().describe('Linked bank account'),
  isActive: z.boolean().optional().default(true),
});

export type CreateDepositInput = z.infer<typeof CreateDepositSchema>;

export const UpdateDepositSchema = CreateDepositSchema.partial();
export type UpdateDepositInput = z.infer<typeof UpdateDepositSchema>;

export const DepositResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  balance: z.number(),
  currency: CurrencyEnum,
  annualRate: z.number().nullable(),
  effectiveRate: z.number().nullable(),
  startDate: z.string().date().nullable(),
  maturityDate: z.string().date().nullable(),
  bankAccountId: z.string().uuid().nullable(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type DepositResponse = z.infer<typeof DepositResponseSchema>;
