import { createZodDto } from 'nestjs-zod';
import { TransactionResponseSchema } from '@budget/schemas';

export class TransactionResponseDto extends createZodDto(TransactionResponseSchema) {}
