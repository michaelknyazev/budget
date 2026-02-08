import { Migration } from '@mikro-orm/migrations';

export class Migration20260207164846 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "exchange_rate" ("id" uuid not null, "currency" text check ("currency" in ('USD', 'GEL', 'RUB', 'EUR', 'GBP')) not null, "rate_to_gel" numeric(12,6) not null, "quantity" int not null, "raw_rate" numeric(12,6) not null, "date" date not null, "source" text check ("source" in ('NBG_API', 'MANUAL', 'BANK_STATEMENT')) not null, "created_at" timestamptz not null default now(), constraint "exchange_rate_pkey" primary key ("id"));`);
    this.addSql(`alter table "exchange_rate" add constraint "exchange_rate_currency_date_unique" unique ("currency", "date");`);

    this.addSql(`create table "user" ("id" varchar(36) not null, "name" text not null, "email" text not null, "email_verified" boolean not null default false, "image" text null, "display_currency" text check ("display_currency" in ('USD', 'GEL', 'RUB', 'EUR', 'GBP')) not null default 'USD', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), constraint "user_pkey" primary key ("id"));`);
    this.addSql(`alter table "user" add constraint "user_email_unique" unique ("email");`);

    // better-auth required tables
    this.addSql(`create table "session" ("id" varchar(36) not null, "expires_at" timestamptz not null, "token" text not null, "ip_address" text null, "user_agent" text null, "user_id" varchar(36) not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), constraint "session_pkey" primary key ("id"));`);
    this.addSql(`alter table "session" add constraint "session_token_unique" unique ("token");`);
    this.addSql(`alter table "session" add constraint "session_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;`);

    this.addSql(`create table "account" ("id" varchar(36) not null, "account_id" text not null, "provider_id" text not null, "user_id" varchar(36) not null, "access_token" text null, "refresh_token" text null, "id_token" text null, "access_token_expires_at" timestamptz null, "refresh_token_expires_at" timestamptz null, "scope" text null, "password" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), constraint "account_pkey" primary key ("id"));`);
    this.addSql(`alter table "account" add constraint "account_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;`);

    this.addSql(`create table "verification" ("id" varchar(36) not null, "identifier" text not null, "value" text not null, "expires_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), constraint "verification_pkey" primary key ("id"));`);

    this.addSql(`create table "loan" ("id" uuid not null, "user_id" varchar(36) not null, "title" text not null, "amount_left" numeric(12,2) not null, "monthly_payment" numeric(12,2) not null, "currency" text check ("currency" in ('USD', 'GEL', 'RUB', 'EUR', 'GBP')) not null, "holder" text not null, "loan_number" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), constraint "loan_pkey" primary key ("id"));`);

    this.addSql(`create table "income_source" ("id" uuid not null, "user_id" varchar(36) not null, "name" text not null, "currency" text check ("currency" in ('USD', 'GEL', 'RUB', 'EUR', 'GBP')) not null, "default_amount" numeric(12,2) null, "is_active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), constraint "income_source_pkey" primary key ("id"));`);

    this.addSql(`create table "category" ("id" uuid not null, "user_id" varchar(36) not null, "name" text not null, "type" text check ("type" in ('EXPENSE', 'INCOME', 'ANY')) not null, "icon" text null, "color" text null, "mcc_codes" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), constraint "category_pkey" primary key ("id"));`);

    this.addSql(`create table "subscription" ("id" uuid not null, "user_id" varchar(36) not null, "category_id" uuid null, "title" text not null, "amount" numeric(12,2) not null, "currency" text check ("currency" in ('USD', 'GEL', 'RUB', 'EUR', 'GBP')) not null, "day_of_month" int not null, "owner" text null, "is_active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), constraint "subscription_pkey" primary key ("id"));`);

    this.addSql(`create table "budget_target" ("id" uuid not null, "user_id" varchar(36) not null, "category_id" uuid null, "month" int not null, "year" int not null, "target_amount" numeric(12,2) not null, "currency" text check ("currency" in ('USD', 'GEL', 'RUB', 'EUR', 'GBP')) not null, "type" varchar(10) not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), constraint "budget_target_pkey" primary key ("id"));`);

    this.addSql(`create table "bank_account" ("id" uuid not null, "user_id" varchar(36) not null, "iban" text not null, "bank_name" text not null, "bank_code" text null, "account_owner" text not null, "linked_cards" jsonb not null, "account_type" text check ("account_type" in ('CHECKING', 'DEPOSIT', 'SAVINGS')) not null, "interest_rate" numeric(12,2) null, "effective_rate" numeric(12,2) null, "is_active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), constraint "bank_account_pkey" primary key ("id"));`);

    this.addSql(`create table "bank_import" ("id" uuid not null, "bank_account_id" uuid not null, "file_name" text not null, "period_from" date not null, "period_to" date not null, "starting_balance" jsonb not null, "end_balance" jsonb not null, "transaction_count" int not null default 0, "imported_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), constraint "bank_import_pkey" primary key ("id"));`);

    this.addSql(`create table "transaction" ("id" uuid not null, "import_hash" varchar(64) null, "title" text not null, "amount" numeric(12,2) not null, "currency" text check ("currency" in ('USD', 'GEL', 'RUB', 'EUR', 'GBP')) not null, "type" text check ("type" in ('EXPENSE', 'INCOME', 'TRANSFER', 'LOAN_DISBURSEMENT', 'LOAN_REPAYMENT', 'LOAN_INTEREST', 'FX_CONVERSION', 'DEPOSIT', 'FEE', 'ATM_WITHDRAWAL', 'INTEREST_INCOME')) not null, "date" date not null, "posting_date" date null, "merchant_name" text null, "merchant_location" text null, "mcc_code" int null, "card_last_four" varchar(4) null, "raw_details" text null, "metadata" jsonb null, "user_id" varchar(36) not null, "bank_import_id" uuid null, "category_id" uuid null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), constraint "transaction_pkey" primary key ("id"));`);
    this.addSql(`create index "idx_transaction_import_hash" on "transaction" ("import_hash");`);
    this.addSql(`alter table "transaction" add constraint "transaction_import_hash_unique" unique ("import_hash");`);
    this.addSql(`create index "idx_transaction_date" on "transaction" ("date");`);
    this.addSql(`create index "idx_transaction_mcc_code" on "transaction" ("mcc_code");`);
    this.addSql(`create index "idx_transaction_user_id" on "transaction" ("user_id");`);
    this.addSql(`create index "idx_transaction_bank_import" on "transaction" ("bank_import_id");`);

    this.addSql(`alter table "loan" add constraint "loan_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "income_source" add constraint "income_source_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "category" add constraint "category_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "subscription" add constraint "subscription_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "subscription" add constraint "subscription_category_id_foreign" foreign key ("category_id") references "category" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "budget_target" add constraint "budget_target_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "budget_target" add constraint "budget_target_category_id_foreign" foreign key ("category_id") references "category" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "bank_account" add constraint "bank_account_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "bank_import" add constraint "bank_import_bank_account_id_foreign" foreign key ("bank_account_id") references "bank_account" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "transaction" add constraint "transaction_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "transaction" add constraint "transaction_bank_import_id_foreign" foreign key ("bank_import_id") references "bank_import" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table "transaction" add constraint "transaction_category_id_foreign" foreign key ("category_id") references "category" ("id") on update cascade on delete set null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "loan" drop constraint "loan_user_id_foreign";`);

    this.addSql(`alter table "income_source" drop constraint "income_source_user_id_foreign";`);

    this.addSql(`alter table "category" drop constraint "category_user_id_foreign";`);

    this.addSql(`alter table "subscription" drop constraint "subscription_user_id_foreign";`);

    this.addSql(`alter table "budget_target" drop constraint "budget_target_user_id_foreign";`);

    this.addSql(`alter table "bank_account" drop constraint "bank_account_user_id_foreign";`);

    this.addSql(`alter table "transaction" drop constraint "transaction_user_id_foreign";`);

    this.addSql(`alter table "subscription" drop constraint "subscription_category_id_foreign";`);

    this.addSql(`alter table "budget_target" drop constraint "budget_target_category_id_foreign";`);

    this.addSql(`alter table "transaction" drop constraint "transaction_category_id_foreign";`);

    this.addSql(`alter table "bank_import" drop constraint "bank_import_bank_account_id_foreign";`);

    this.addSql(`alter table "transaction" drop constraint "transaction_bank_import_id_foreign";`);

    this.addSql(`drop table if exists "exchange_rate" cascade;`);

    this.addSql(`drop table if exists "verification" cascade;`);
    this.addSql(`drop table if exists "account" cascade;`);
    this.addSql(`drop table if exists "session" cascade;`);
    this.addSql(`drop table if exists "user" cascade;`);

    this.addSql(`drop table if exists "loan" cascade;`);

    this.addSql(`drop table if exists "income_source" cascade;`);

    this.addSql(`drop table if exists "category" cascade;`);

    this.addSql(`drop table if exists "subscription" cascade;`);

    this.addSql(`drop table if exists "budget_target" cascade;`);

    this.addSql(`drop table if exists "bank_account" cascade;`);

    this.addSql(`drop table if exists "bank_import" cascade;`);

    this.addSql(`drop table if exists "transaction" cascade;`);
  }

}
