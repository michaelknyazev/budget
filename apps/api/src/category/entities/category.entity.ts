import { Entity, PrimaryKey, Property, ManyToOne, Enum, Opt } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { CategoryType } from '@budget/schemas';

@Entity({ tableName: 'category' })
export class Category {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID();

  @ManyToOne('User', { deleteRule: 'cascade', updateRule: 'cascade' })
  user!: any;

  @Property({ type: 'text' })
  name!: string;

  @Enum(() => CategoryType)
  type!: CategoryType;

  @Property({ type: 'text', nullable: true })
  icon?: string | null;

  @Property({ type: 'text', nullable: true })
  color?: string | null;

  @Property({ type: 'jsonb', nullable: true })
  mccCodes?: number[] | null;

  @Property({ type: 'timestamptz', defaultRaw: 'NOW()' })
  createdAt: Date & Opt = new Date();

  @Property({ type: 'timestamptz', defaultRaw: 'NOW()', onUpdate: () => new Date() })
  updatedAt: Date & Opt = new Date();
}
