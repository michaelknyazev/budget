import { createZodDto } from 'nestjs-zod';
import { UpdateLoanSchema } from '@budget/schemas';

export class UpdateLoanDto extends createZodDto(UpdateLoanSchema) {}
