import { Migration } from '@mikro-orm/migrations';

export class Migration20260208092159 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "planned_income" ("id" uuid not null, "user_id" varchar(36) not null, "income_source_id" uuid not null, "month" int not null, "year" int not null, "planned_amount" numeric(12,2) not null, "notes" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), constraint "planned_income_pkey" primary key ("id"));`);
    this.addSql(`alter table "planned_income" add constraint "planned_income_user_id_income_source_id_month_year_unique" unique ("user_id", "income_source_id", "month", "year");`);

    this.addSql(`alter table "planned_income" add constraint "planned_income_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "planned_income" add constraint "planned_income_income_source_id_foreign" foreign key ("income_source_id") references "income_source" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "transaction" add column "income_source_id" uuid null;`);
    this.addSql(`alter table "transaction" add constraint "transaction_income_source_id_foreign" foreign key ("income_source_id") references "income_source" ("id") on update cascade on delete set null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "planned_income" cascade;`);

    this.addSql(`alter table "transaction" drop constraint "transaction_income_source_id_foreign";`);

    this.addSql(`alter table "transaction" drop column "income_source_id";`);
  }

}
