import { Migration } from '@mikro-orm/migrations';

export class Migration20260208185030 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "transaction" add column "exchange_rate_id" uuid null;`);
    this.addSql(`alter table "transaction" add constraint "transaction_exchange_rate_id_foreign" foreign key ("exchange_rate_id") references "exchange_rate" ("id") on update cascade on delete set null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "transaction" drop constraint "transaction_exchange_rate_id_foreign";`);

    this.addSql(`alter table "transaction" drop column "exchange_rate_id";`);
  }

}
