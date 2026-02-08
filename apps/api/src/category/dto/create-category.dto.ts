import { createZodDto } from 'nestjs-zod';
import { CreateCategorySchema } from '@budget/schemas';

export class CreateCategoryDto extends createZodDto(CreateCategorySchema) {}
