import { Entity, PrimaryKey, Property, ManyToOne, Enum, Opt } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Currency } from '@budget/schemas';

@Entity({ tableName: 'deposit' })
export class Deposit {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID();

  @ManyToOne('User', { deleteRule: 'cascade', updateRule: 'cascade' })
  user!: any;

  @ManyToOne('BankAccount', { nullable: true, deleteRule: 'set null', updateRule: 'cascade' })
  bankAccount?: any | null;

  @Property({ type: 'text' })
  title!: string;

  @Property({ type: 'decimal', precision: 12, scale: 2 })
  balance!: string;

  @Enum(() => Currency)
  currency!: Currency;

  @Property({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  annualRate?: string | null;

  @Property({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  effectiveRate?: string | null;

  @Property({ type: 'date', nullable: true })
  startDate?: Date | null;

  @Property({ type: 'date', nullable: true })
  maturityDate?: Date | null;

  @Property({ type: 'boolean' })
  isActive: boolean & Opt = true;

  @Property({ type: 'timestamptz', defaultRaw: 'NOW()' })
  createdAt: Date & Opt = new Date();

  @Property({ type: 'timestamptz', defaultRaw: 'NOW()', onUpdate: () => new Date() })
  updatedAt: Date & Opt = new Date();
}
