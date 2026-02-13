import { Migration } from '@mikro-orm/migrations';

export class Migration20260208204644 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "transaction" add column "planned_income_id" uuid null;`);
    this.addSql(`alter table "transaction" add constraint "transaction_planned_income_id_foreign" foreign key ("planned_income_id") references "planned_income" ("id") on update cascade on delete set null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "transaction" drop constraint "transaction_planned_income_id_foreign";`);

    this.addSql(`alter table "transaction" drop column "planned_income_id";`);
  }

}
