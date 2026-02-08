import { Entity, PrimaryKey, Property, ManyToOne, Enum, Opt } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Currency } from '@budget/schemas';

@Entity({ tableName: 'income_source' })
export class IncomeSource {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID();

  @ManyToOne('User', { deleteRule: 'cascade', updateRule: 'cascade' })
  user!: any;

  @Property({ type: 'text' })
  name!: string;

  @Enum(() => Currency)
  currency!: Currency;

  @Property({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  defaultAmount?: string | null;

  @Property({ type: 'boolean' })
  isActive: boolean & Opt = true;

  @Property({ type: 'timestamptz', defaultRaw: 'NOW()' })
  createdAt: Date & Opt = new Date();

  @Property({ type: 'timestamptz', defaultRaw: 'NOW()', onUpdate: () => new Date() })
  updatedAt: Date & Opt = new Date();
}
