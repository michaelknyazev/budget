import { Entity, PrimaryKey, Property, ManyToOne, Enum, Index, Opt } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Currency, TransactionType } from '@budget/schemas';

@Entity({ tableName: 'transaction' })
export class Transaction {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID();

  @Index({ name: 'idx_transaction_import_hash' })
  @Property({ type: 'varchar', length: 64, nullable: true, unique: true })
  importHash?: string | null;

  @Property({ type: 'text' })
  title!: string;

  @Property({ type: 'decimal', precision: 12, scale: 2 })
  amount!: string;

  @Enum(() => Currency)
  currency!: Currency;

  @Enum(() => TransactionType)
  type!: TransactionType;

  @Index({ name: 'idx_transaction_date' })
  @Property({ type: 'date' })
  date!: Date;

  @Property({ type: 'date', nullable: true })
  postingDate?: Date | null;

  @Property({ type: 'text', nullable: true })
  merchantName?: string | null;

  @Property({ type: 'text', nullable: true })
  merchantLocation?: string | null;

  @Index({ name: 'idx_transaction_mcc_code' })
  @Property({ type: 'integer', nullable: true })
  mccCode?: number | null;

  @Property({ type: 'varchar', length: 4, nullable: true })
  cardLastFour?: string | null;

  @Property({ type: 'text', nullable: true })
  rawDetails?: string | null;

  @Property({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown> | null;

  @Index({ name: 'idx_transaction_user_id' })
  @ManyToOne('User', { deleteRule: 'cascade', updateRule: 'cascade' })
  user!: any;

  @Index({ name: 'idx_transaction_bank_import' })
  @ManyToOne('BankImport', { nullable: true, deleteRule: 'cascade', updateRule: 'cascade' })
  bankImport?: any | null;

  @ManyToOne('Category', { nullable: true, deleteRule: 'set null', updateRule: 'cascade' })
  category?: any | null;

  @ManyToOne('IncomeSource', { nullable: true, deleteRule: 'set null', updateRule: 'cascade' })
  incomeSource?: any | null;

  @ManyToOne('PlannedIncome', { nullable: true, deleteRule: 'set null', updateRule: 'cascade' })
  plannedIncome?: any | null;

  @ManyToOne('ExchangeRate', { nullable: true, deleteRule: 'set null', updateRule: 'cascade' })
  exchangeRate?: any | null;

  @Property({ type: 'timestamptz', defaultRaw: 'NOW()' })
  createdAt: Date & Opt = new Date();

  @Property({ type: 'timestamptz', defaultRaw: 'NOW()', onUpdate: () => new Date() })
  updatedAt: Date & Opt = new Date();
}
