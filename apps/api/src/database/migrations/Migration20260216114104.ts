import { Migration } from '@mikro-orm/migrations';

export class Migration20260216114104 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "loan" add column "is_repaid" boolean not null default false;`);
    this.addSql(`update "loan" set "is_repaid" = true where "amount_left"::numeric = 0;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "loan" drop column "is_repaid";`);
  }

}
