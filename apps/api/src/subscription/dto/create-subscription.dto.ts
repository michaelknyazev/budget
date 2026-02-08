import { createZodDto } from 'nestjs-zod';
import { CreateSubscriptionSchema } from '@budget/schemas';

export class CreateSubscriptionDto extends createZodDto(CreateSubscriptionSchema) {}
