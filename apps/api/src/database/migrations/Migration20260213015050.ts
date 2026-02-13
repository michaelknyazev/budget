import { Migration } from '@mikro-orm/migrations';

export class Migration20260213015050 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "skipped_transaction" ("id" uuid not null, "bank_import_id" uuid not null, "import_hash" varchar(64) not null, "reason" varchar(32) not null, "date" date not null, "amount" numeric(12,2) not null, "currency" text check ("currency" in ('USD', 'GEL', 'RUB', 'EUR', 'GBP')) not null, "raw_details" text not null, "existing_transaction_id" uuid null, "created_at" timestamptz not null default now(), constraint "skipped_transaction_pkey" primary key ("id"));`);
    this.addSql(`create index "idx_skipped_transaction_bank_import" on "skipped_transaction" ("bank_import_id");`);

    this.addSql(`alter table "skipped_transaction" add constraint "skipped_transaction_bank_import_id_foreign" foreign key ("bank_import_id") references "bank_import" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "skipped_transaction" add constraint "skipped_transaction_existing_transaction_id_foreign" foreign key ("existing_transaction_id") references "transaction" ("id") on update cascade on delete set null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "skipped_transaction" cascade;`);
  }

}
