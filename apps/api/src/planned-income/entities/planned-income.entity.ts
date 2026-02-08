import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
  Unique,
  Opt,
} from '@mikro-orm/core';
import { randomUUID } from 'crypto';

@Entity({ tableName: 'planned_income' })
@Unique({ properties: ['user', 'incomeSource', 'month', 'year'] })
export class PlannedIncome {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID();

  @ManyToOne('User', { deleteRule: 'cascade', updateRule: 'cascade' })
  user!: any;

  @ManyToOne('IncomeSource', {
    deleteRule: 'cascade',
    updateRule: 'cascade',
  })
  incomeSource!: any;

  @Property({ type: 'integer' })
  month!: number;

  @Property({ type: 'integer' })
  year!: number;

  @Property({ type: 'decimal', precision: 12, scale: 2 })
  plannedAmount!: string;

  @Property({ type: 'text', nullable: true })
  notes?: string | null;

  @Property({ type: 'timestamptz', defaultRaw: 'NOW()' })
  createdAt: Date & Opt = new Date();

  @Property({
    type: 'timestamptz',
    defaultRaw: 'NOW()',
    onUpdate: () => new Date(),
  })
  updatedAt: Date & Opt = new Date();
}
