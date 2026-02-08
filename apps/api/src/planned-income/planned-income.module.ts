import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PlannedIncome } from './entities/planned-income.entity';
import { PlannedIncomeService } from './services/planned-income.service';
import { PlannedIncomeController } from './controllers/planned-income.controller';
import { IncomeSourceModule } from '@/income-source/income-source.module';
import { ExchangeRateModule } from '@/exchange-rate/exchange-rate.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([PlannedIncome]),
    IncomeSourceModule,
    ExchangeRateModule,
  ],
  providers: [PlannedIncomeService],
  controllers: [PlannedIncomeController],
  exports: [PlannedIncomeService],
})
export class PlannedIncomeModule {}
