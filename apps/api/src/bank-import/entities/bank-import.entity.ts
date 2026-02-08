import { Entity, PrimaryKey, Property, ManyToOne, Opt } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

@Entity({ tableName: 'bank_import' })
export class BankImport {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID();

  @ManyToOne('BankAccount', { deleteRule: 'cascade', updateRule: 'cascade' })
  bankAccount!: any;

  @Property({ type: 'text' })
  fileName!: string;

  @Property({ type: 'date' })
  periodFrom!: Date;

  @Property({ type: 'date' })
  periodTo!: Date;

  @Property({ type: 'jsonb' })
  startingBalance: Record<string, number> & Opt = {};

  @Property({ type: 'jsonb' })
  endBalance: Record<string, number> & Opt = {};

  @Property({ type: 'integer' })
  transactionCount: number & Opt = 0;

  @Property({ type: 'timestamptz' })
  importedAt!: Date;

  @Property({ type: 'timestamptz', defaultRaw: 'NOW()' })
  createdAt: Date & Opt = new Date();

  @Property({ type: 'timestamptz', defaultRaw: 'NOW()', onUpdate: () => new Date() })
  updatedAt: Date & Opt = new Date();
}
