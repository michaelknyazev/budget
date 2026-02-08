import { createZodDto } from 'nestjs-zod';
import {
  CreatePlannedIncomeSchema,
  UpdatePlannedIncomeSchema,
  QueryPlannedIncomeSchema,
  QueryPlannedIncomeComparisonSchema,
} from '@budget/schemas';

export class CreatePlannedIncomeDto extends createZodDto(
  CreatePlannedIncomeSchema,
) {}

export class UpdatePlannedIncomeDto extends createZodDto(
  UpdatePlannedIncomeSchema,
) {}

export class QueryPlannedIncomeDto extends createZodDto(
  QueryPlannedIncomeSchema,
) {}

export class QueryPlannedIncomeComparisonDto extends createZodDto(
  QueryPlannedIncomeComparisonSchema,
) {}
