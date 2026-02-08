import { createZodDto } from 'nestjs-zod';
import { UpdateDepositSchema } from '@budget/schemas';

export class UpdateDepositDto extends createZodDto(UpdateDepositSchema) {}
