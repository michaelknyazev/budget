import { z } from 'zod';
import { CurrencyEnum } from './enums';

export const CreateSubscriptionSchema = z.object({
  title: z.string().min(1).max(200).describe('Subscription name'),
  amount: z
    .number()
    .positive()
    .multipleOf(0.01)
    .describe('Monthly amount'),
  currency: CurrencyEnum,
  dayOfMonth: z.number().int().min(1).max(31).describe('Billing day'),
  owner: z
    .string()
    .max(100)
    .nullable()
    .optional()
    .describe('Who owns this subscription'),
  categoryId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().default(true),
});

export type CreateSubscriptionInput = z.infer<typeof CreateSubscriptionSchema>;

export const UpdateSubscriptionSchema = CreateSubscriptionSchema.partial();
export type UpdateSubscriptionInput = z.infer<typeof UpdateSubscriptionSchema>;
