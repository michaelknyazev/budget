import { Entity, PrimaryKey, Property, ManyToOne, Enum, Opt } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Currency } from '@budget/schemas';

@Entity({ tableName: 'budget_target' })
export class BudgetTarget {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID();

  @ManyToOne('User', { deleteRule: 'cascade', updateRule: 'cascade' })
  user!: any;

  @ManyToOne('Category', { nullable: true, deleteRule: 'set null', updateRule: 'cascade' })
  category?: any | null;

  @Property({ type: 'integer' })
  month!: number;

  @Property({ type: 'integer' })
  year!: number;

  @Property({ type: 'decimal', precision: 12, scale: 2 })
  targetAmount!: string;

  @Enum(() => Currency)
  currency!: Currency;

  @Property({ type: 'varchar', length: 10 })
  type!: 'EXPENSE' | 'INCOME';

  @Property({ type: 'timestamptz', defaultRaw: 'NOW()' })
  createdAt: Date & Opt = new Date();

  @Property({ type: 'timestamptz', defaultRaw: 'NOW()', onUpdate: () => new Date() })
  updatedAt: Date & Opt = new Date();
}
