import { Migration } from '@mikro-orm/migrations';

export class Migration20260208080233 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "deposit" ("id" uuid not null, "user_id" varchar(36) not null, "bank_account_id" uuid null, "title" text not null, "balance" numeric(12,2) not null, "currency" text check ("currency" in ('USD', 'GEL', 'RUB', 'EUR', 'GBP')) not null, "annual_rate" numeric(5,2) null, "effective_rate" numeric(5,2) null, "start_date" date null, "maturity_date" date null, "is_active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), constraint "deposit_pkey" primary key ("id"));`);

    this.addSql(`alter table "deposit" add constraint "deposit_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "deposit" add constraint "deposit_bank_account_id_foreign" foreign key ("bank_account_id") references "bank_account" ("id") on update cascade on delete set null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "deposit" cascade;`);
  }

}
