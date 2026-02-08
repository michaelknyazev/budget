import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { IncomeSource } from './entities/income-source.entity';
import { IncomeSourceService } from './services/income-source.service';
import { IncomeSourceController } from './controllers/income-source.controller';

@Module({
  imports: [MikroOrmModule.forFeature([IncomeSource])],
  providers: [IncomeSourceService],
  controllers: [IncomeSourceController],
  exports: [IncomeSourceService],
})
export class IncomeSourceModule {}
