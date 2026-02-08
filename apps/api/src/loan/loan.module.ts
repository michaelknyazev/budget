import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Loan } from './entities/loan.entity';
import { LoanService } from './services/loan.service';
import { LoanController } from './controllers/loan.controller';

@Module({
  imports: [MikroOrmModule.forFeature([Loan])],
  providers: [LoanService],
  controllers: [LoanController],
  exports: [LoanService],
})
export class LoanModule {}
