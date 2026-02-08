import { createZodDto } from 'nestjs-zod';
import { UpdateCategorySchema } from '@budget/schemas';

export class UpdateCategoryDto extends createZodDto(UpdateCategorySchema) {}
