import { createZodDto } from 'nestjs-zod';
import { CreateIncomeSourceSchema } from '@budget/schemas';

export class CreateIncomeSourceDto extends createZodDto(CreateIncomeSourceSchema) {}
