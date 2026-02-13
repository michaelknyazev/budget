import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Transaction } from '@/transaction/entities/transaction.entity';
import { BankImport } from '@/bank-import/entities/bank-import.entity';
import { ExchangeRateModule } from '@/exchange-rate/exchange-rate.module';
import { SubscriptionModule } from '@/subscription/subscription.module';
import { LoanModule } from '@/loan/loan.module';
import { PlannedIncomeModule } from '@/planned-income/planned-income.module';
import { BudgetTargetModule } from '@/budget-target/budget-target.module';
import { DashboardService } from './services/dashboard.service';
import { DashboardController } from './controllers/dashboard.controller';

@Module({
  imports: [
    MikroOrmModule.forFeature([Transaction, BankImport]),
    ExchangeRateModule,
    SubscriptionModule,
    LoanModule,
    PlannedIncomeModule,
    BudgetTargetModule,
  ],
  providers: [DashboardService],
  controllers: [DashboardController],
  exports: [DashboardService],
})
export class DashboardModule {}
