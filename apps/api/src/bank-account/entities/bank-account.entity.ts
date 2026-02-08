import { Entity, PrimaryKey, Property, ManyToOne, Enum, Opt } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { AccountType } from '@budget/schemas';

@Entity({ tableName: 'bank_account' })
export class BankAccount {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID();

  @ManyToOne('User', { deleteRule: 'cascade', updateRule: 'cascade' })
  user!: any;

  @Property({ type: 'text' })
  iban!: string;

  @Property({ type: 'text' })
  bankName!: string;

  @Property({ type: 'text', nullable: true })
  bankCode?: string | null;

  @Property({ type: 'text' })
  accountOwner!: string;

  @Property({ type: 'jsonb' })
  linkedCards: Array<{ lastFour: string; label: string }> & Opt = [];

  @Enum(() => AccountType)
  accountType!: AccountType;

  @Property({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  interestRate?: string | null;

  @Property({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  effectiveRate?: string | null;

  @Property({ type: 'boolean' })
  isActive: boolean & Opt = true;

  @Property({ type: 'timestamptz', defaultRaw: 'NOW()' })
  createdAt: Date & Opt = new Date();

  @Property({ type: 'timestamptz', defaultRaw: 'NOW()', onUpdate: () => new Date() })
  updatedAt: Date & Opt = new Date();
}
