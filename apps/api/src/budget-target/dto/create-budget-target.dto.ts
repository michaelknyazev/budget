import { createZodDto } from 'nestjs-zod';
import { CreateBudgetTargetSchema } from '@budget/schemas';

export class CreateBudgetTargetDto extends createZodDto(CreateBudgetTargetSchema) {}
