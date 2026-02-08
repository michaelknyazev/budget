import { createZodDto } from 'nestjs-zod';
import { QueryTransactionsSchema } from '@budget/schemas';

export class QueryTransactionsDto extends createZodDto(QueryTransactionsSchema) {}
