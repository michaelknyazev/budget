import { z } from 'zod';
import { AccountTypeEnum } from './enums';

export const CreateBankAccountSchema = z.object({
  iban: z.string().min(15).max(34).describe('IBAN'),
  bankName: z.string().min(1).max(200).describe('Bank name'),
  bankCode: z
    .string()
    .max(20)
    .nullable()
    .optional()
    .describe('SWIFT/BIC code'),
  accountOwner: z.string().min(1).max(200).describe('Account owner name'),
  accountType: AccountTypeEnum.describe('Account type'),
  interestRate: z
    .number()
    .min(0)
    .max(100)
    .nullable()
    .optional()
    .describe('Annual interest rate (for DEPOSIT)'),
  effectiveRate: z
    .number()
    .min(0)
    .max(100)
    .nullable()
    .optional()
    .describe('Effective annual rate (for DEPOSIT)'),
});

export type CreateBankAccountInput = z.infer<typeof CreateBankAccountSchema>;

export const UpdateBankAccountSchema = CreateBankAccountSchema.partial();
export type UpdateBankAccountInput = z.infer<typeof UpdateBankAccountSchema>;
