import {
  Entity,
  PrimaryKey,
  Property,
  Enum,
  Opt,
} from '@mikro-orm/core';
import { Currency } from '@budget/schemas';

/**
 * User entity — extends better-auth's user table with budget-specific fields.
 * better-auth manages the core fields (email, name, emailVerified, image).
 * We add displayCurrency as a budget-specific preference.
 */
@Entity({ tableName: 'user' })
export class User {
  @PrimaryKey({ type: 'varchar', length: 36 })
  id!: string;

  @Property({ type: 'text' })
  name!: string;

  @Property({ type: 'text', unique: true })
  email!: string;

  @Property({ type: 'boolean' })
  emailVerified: boolean & Opt = false;

  @Property({ type: 'text', nullable: true })
  image?: string | null;

  @Enum(() => Currency)
  displayCurrency: Currency & Opt = Currency.USD;

  @Property({ type: 'timestamptz' })
  createdAt!: Date;

  @Property({ type: 'timestamptz' })
  updatedAt!: Date;
}
