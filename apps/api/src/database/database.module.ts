import { Global, Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import config from '../mikro-orm.config';

@Global()
@Module({
  imports: [MikroOrmModule.forRoot(config)],
})
export class DatabaseModule {}
