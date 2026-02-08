import { Entity, PrimaryKey, Property, Enum, Unique, Opt } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Currency, ExchangeRateSource } from '@budget/schemas';

@Entity({ tableName: 'exchange_rate' })
@Unique({ properties: ['currency', 'date'] })
export class ExchangeRate {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID();

  @Enum(() => Currency)
  currency!: Currency;

  @Property({ type: 'decimal', precision: 12, scale: 6 })
  rateToGel!: string;

  @Property({ type: 'integer' })
  quantity!: number;

  @Property({ type: 'decimal', precision: 12, scale: 6 })
  rawRate!: string;

  @Property({ type: 'date' })
  date!: Date;

  @Enum(() => ExchangeRateSource)
  source!: ExchangeRateSource;

  @Property({ type: 'timestamptz', defaultRaw: 'NOW()' })
  createdAt: Date & Opt = new Date();
}
