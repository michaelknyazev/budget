import { createZodDto } from 'nestjs-zod';
import { CreateDepositSchema } from '@budget/schemas';

export class CreateDepositDto extends createZodDto(CreateDepositSchema) {}
