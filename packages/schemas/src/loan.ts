import { z } from 'zod';
import { CurrencyEnum } from './enums';

export const CreateLoanSchema = z.object({
  title: z.string().min(1).max(200).describe('Loan name'),
  amountLeft: z
    .number()
    .positive()
    .multipleOf(0.01)
    .describe('Remaining balance'),
  monthlyPayment: z
    .number()
    .positive()
    .multipleOf(0.01)
    .describe('Monthly payment'),
  currency: CurrencyEnum,
  holder: z.string().min(1).max(100).describe('Loan holder'),
  loanNumber: z
    .string()
    .max(50)
    .nullable()
    .optional()
    .describe('Bank loan reference number'),
});

export type CreateLoanInput = z.infer<typeof CreateLoanSchema>;

export const UpdateLoanSchema = CreateLoanSchema.partial().extend({
  isRepaid: z.boolean().optional().describe('Whether the loan is fully repaid'),
});
export type UpdateLoanInput = z.infer<typeof UpdateLoanSchema>;
