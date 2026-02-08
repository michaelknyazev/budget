import { createZodDto } from 'nestjs-zod';
import { ExchangeRateSchema, QueryExchangeRateSchema } from '@budget/schemas';

export class ExchangeRateDto extends createZodDto(ExchangeRateSchema) {}
export class QueryExchangeRateDto extends createZodDto(QueryExchangeRateSchema) {}
