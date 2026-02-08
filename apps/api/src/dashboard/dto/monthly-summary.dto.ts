import { createZodDto } from 'nestjs-zod';
import {
  QueryMonthlySummarySchema,
  QueryYearlySummarySchema,
  QueryMonthlyReportSchema,
} from '@budget/schemas';

export class QueryMonthlySummaryDto extends createZodDto(QueryMonthlySummarySchema) {}
export class QueryYearlySummaryDto extends createZodDto(QueryYearlySummarySchema) {}
export class QueryMonthlyReportDto extends createZodDto(QueryMonthlyReportSchema) {}
