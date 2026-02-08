import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { BankImport } from './entities/bank-import.entity';
import { Transaction } from '@/transaction/entities/transaction.entity';
import { BankAccount } from '@/bank-account/entities/bank-account.entity';
import { BankImportService } from './services/bank-import.service';
import { BankImportController } from './controllers/bank-import.controller';
import { DepositModule } from '@/deposit/deposit.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([BankImport, Transaction, BankAccount]),
    DepositModule,
  ],
  providers: [BankImportService],
  controllers: [BankImportController],
  exports: [BankImportService],
})
export class BankImportModule {}
