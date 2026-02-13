import { Entity, PrimaryKey, Property, ManyToOne, Enum, Unique, Opt } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Currency } from '@budget/schemas';

@Entity({ tableName: 'budget_target' })
@Unique({ properties: ['user', 'name', 'month', 'year'] })
export class BudgetTarget {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID();

  @ManyToOne('User', { deleteRule: 'cascade', updateRule: 'cascade' })
  user!: any;

  @Property({ type: 'text' })
  name!: string;

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
