import { createZodDto } from 'nestjs-zod';
import { QueryMonthlySummarySchema } from '@budget/schemas';

export class QueryMonthlySummaryDto extends createZodDto(QueryMonthlySummarySchema) {}
