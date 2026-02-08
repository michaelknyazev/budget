import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { ZodValidationPipe } from 'nestjs-zod';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { TransactionModule } from './transaction/transaction.module';
import { CategoryModule } from './category/category.module';
import { BankAccountModule } from './bank-account/bank-account.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { LoanModule } from './loan/loan.module';
import { DepositModule } from './deposit/deposit.module';
import { IncomeSourceModule } from './income-source/income-source.module';
import { BudgetTargetModule } from './budget-target/budget-target.module';
import { ExchangeRateModule } from './exchange-rate/exchange-rate.module';
import { BankImportModule } from './bank-import/bank-import.module';
import { PlannedIncomeModule } from './planned-income/planned-income.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    // Global config from .env
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),

    // Structured logging
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
      },
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'medium', ttl: 10000, limit: 50 },
    ]),

    // Platform
    DatabaseModule,
    AuthModule,

    // Domain
    TransactionModule,
    CategoryModule,
    BankAccountModule,
    SubscriptionModule,
    LoanModule,
    DepositModule,
    IncomeSourceModule,
    BudgetTargetModule,
    PlannedIncomeModule,

    // Logic
    ExchangeRateModule,
    BankImportModule,

    // Facade
    DashboardModule,
  ],
  providers: [
    // Global Zod validation pipe
    { provide: APP_PIPE, useClass: ZodValidationPipe },
  ],
})
export class AppModule {}
