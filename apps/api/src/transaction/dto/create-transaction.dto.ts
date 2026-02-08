import { createZodDto } from 'nestjs-zod';
import { CreateTransactionSchema } from '@budget/schemas';

export class CreateTransactionDto extends createZodDto(CreateTransactionSchema) {}
