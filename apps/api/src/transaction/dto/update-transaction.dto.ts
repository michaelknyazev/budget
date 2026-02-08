import { createZodDto } from 'nestjs-zod';
import { UpdateTransactionSchema } from '@budget/schemas';

export class UpdateTransactionDto extends createZodDto(UpdateTransactionSchema) {}
