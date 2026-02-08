import { Entity, PrimaryKey, Property, ManyToOne, Enum, Opt } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Currency } from '@budget/schemas';

@Entity({ tableName: 'loan' })
export class Loan {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID();

  @ManyToOne('User', { deleteRule: 'cascade', updateRule: 'cascade' })
  user!: any;

  @Property({ type: 'text' })
  title!: string;

  @Property({ type: 'decimal', precision: 12, scale: 2 })
  amountLeft!: string;

  @Property({ type: 'decimal', precision: 12, scale: 2 })
  monthlyPayment!: string;

  @Enum(() => Currency)
  currency!: Currency;

  @Property({ type: 'text' })
  holder!: string;

  @Property({ type: 'text', nullable: true })
  loanNumber?: string | null;

  @Property({ type: 'timestamptz', defaultRaw: 'NOW()' })
  createdAt: Date & Opt = new Date();

  @Property({ type: 'timestamptz', defaultRaw: 'NOW()', onUpdate: () => new Date() })
  updatedAt: Date & Opt = new Date();
}
