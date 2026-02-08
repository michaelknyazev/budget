import { createZodDto } from 'nestjs-zod';
import { CreateLoanSchema } from '@budget/schemas';

export class CreateLoanDto extends createZodDto(CreateLoanSchema) {}
