import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { BankImport } from './entities/bank-import.entity';
import { SkippedTransaction } from './entities/skipped-transaction.entity';
import { Transaction } from '@/transaction/entities/transaction.entity';
import { BankAccount } from '@/bank-account/entities/bank-account.entity';
import { ExchangeRate } from '@/exchange-rate/entities/exchange-rate.entity';
import { BankImportService } from './services/bank-import.service';
import { BankImportController } from './controllers/bank-import.controller';
import { DepositModule } from '@/deposit/deposit.module';
import { LoanModule } from '@/loan/loan.module';
import { ExchangeRateModule } from '@/exchange-rate/exchange-rate.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([BankImport, SkippedTransaction, Transaction, BankAccount, ExchangeRate]),
    DepositModule,
    LoanModule,
    ExchangeRateModule,
  ],
  providers: [BankImportService],
  controllers: [BankImportController],
  exports: [BankImportService],
})
export class BankImportModule {}
