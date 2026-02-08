import { Entity, PrimaryKey, Property, ManyToOne, Enum, Opt } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Currency } from '@budget/schemas';

@Entity({ tableName: 'subscription' })
export class Subscription {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID();

  @ManyToOne('User', { deleteRule: 'cascade', updateRule: 'cascade' })
  user!: any;

  @ManyToOne('Category', { nullable: true, deleteRule: 'set null', updateRule: 'cascade' })
  category?: any | null;

  @Property({ type: 'text' })
  title!: string;

  @Property({ type: 'decimal', precision: 12, scale: 2 })
  amount!: string;

  @Enum(() => Currency)
  currency!: Currency;

  @Property({ type: 'integer' })
  dayOfMonth!: number;

  @Property({ type: 'text', nullable: true })
  owner?: string | null;

  @Property({ type: 'boolean' })
  isActive: boolean & Opt = true;

  @Property({ type: 'timestamptz', defaultRaw: 'NOW()' })
  createdAt: Date & Opt = new Date();

  @Property({ type: 'timestamptz', defaultRaw: 'NOW()', onUpdate: () => new Date() })
  updatedAt: Date & Opt = new Date();
}
