import { createZodDto } from 'nestjs-zod';
import { UpdateBankAccountSchema } from '@budget/schemas';

export class UpdateBankAccountDto extends createZodDto(UpdateBankAccountSchema) {}
