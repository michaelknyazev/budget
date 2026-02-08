import { createZodDto } from 'nestjs-zod';
import { UpdateSubscriptionSchema } from '@budget/schemas';

export class UpdateSubscriptionDto extends createZodDto(UpdateSubscriptionSchema) {}
