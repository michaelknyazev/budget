import { Entity, PrimaryKey, Property, ManyToOne, Enum, Index, Opt } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Currency } from '@budget/schemas';

@Entity({ tableName: 'skipped_transaction' })
export class SkippedTransaction {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID();

  @Index({ name: 'idx_skipped_transaction_bank_import' })
  @ManyToOne('BankImport', { deleteRule: 'cascade', updateRule: 'cascade' })
  bankImport!: any;

  @Property({ type: 'varchar', length: 64 })
  importHash!: string;

  @Property({ type: 'varchar', length: 32 })
  reason!: string;

  @Property({ type: 'date' })
  date!: Date;

  @Property({ type: 'decimal', precision: 12, scale: 2 })
  amount!: string;

  @Enum(() => Currency)
  currency!: Currency;

  @Property({ type: 'text' })
  rawDetails!: string;

  @ManyToOne('Transaction', { nullable: true, deleteRule: 'set null', updateRule: 'cascade' })
  existingTransaction?: any | null;

  @Property({ type: 'timestamptz', defaultRaw: 'NOW()' })
  createdAt: Date & Opt = new Date();
}
