import { z } from 'zod';
import { CategoryTypeEnum } from './enums';

export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(100).describe('Category name'),
  type: CategoryTypeEnum.describe('Category type'),
  icon: z
    .string()
    .max(50)
    .nullable()
    .optional()
    .describe('Blueprint icon name'),
  color: z
    .string()
    .max(20)
    .nullable()
    .optional()
    .describe('Color for UI tags'),
  mccCodes: z
    .array(z.number().int().min(0).max(9999))
    .nullable()
    .optional()
    .describe('MCC codes for auto-categorization'),
});

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;

export const UpdateCategorySchema = CreateCategorySchema.partial();
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;
