import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Transaction } from './entities/transaction.entity';
import { TransactionService } from './services/transaction.service';
import { TransactionController } from './controllers/transaction.controller';
import { LoanModule } from '@/loan/loan.module';

@Module({
  imports: [MikroOrmModule.forFeature([Transaction]), LoanModule],
  providers: [TransactionService],
  controllers: [TransactionController],
  exports: [TransactionService],
})
export class TransactionModule {}
