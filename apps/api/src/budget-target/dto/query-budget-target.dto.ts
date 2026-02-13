import { createZodDto } from 'nestjs-zod';
import {
  QueryBudgetTargetSchema,
  QueryBudgetTargetComparisonSchema,
} from '@budget/schemas';

export class QueryBudgetTargetDto extends createZodDto(QueryBudgetTargetSchema) {}
export class QueryBudgetTargetComparisonDto extends createZodDto(QueryBudgetTargetComparisonSchema) {}
