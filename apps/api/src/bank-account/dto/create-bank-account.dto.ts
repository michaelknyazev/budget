import { createZodDto } from 'nestjs-zod';
import { CreateBankAccountSchema } from '@budget/schemas';

export class CreateBankAccountDto extends createZodDto(CreateBankAccountSchema) {}
