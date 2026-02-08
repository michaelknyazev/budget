import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Transaction } from '@/transaction/entities/transaction.entity';
import { ExchangeRateModule } from '@/exchange-rate/exchange-rate.module';
import { SubscriptionModule } from '@/subscription/subscription.module';
import { LoanModule } from '@/loan/loan.module';
import { PlannedIncomeModule } from '@/planned-income/planned-income.module';
import { DashboardService } from './services/dashboard.service';
import { DashboardController } from './controllers/dashboard.controller';

@Module({
  imports: [
    MikroOrmModule.forFeature([Transaction]),
    ExchangeRateModule,
    SubscriptionModule,
    LoanModule,
    PlannedIncomeModule,
  ],
  providers: [DashboardService],
  controllers: [DashboardController],
  exports: [DashboardService],
})
export class DashboardModule {}
