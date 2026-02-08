import { createZodDto } from 'nestjs-zod';
import { UpdateIncomeSourceSchema } from '@budget/schemas';

export class UpdateIncomeSourceDto extends createZodDto(UpdateIncomeSourceSchema) {}
