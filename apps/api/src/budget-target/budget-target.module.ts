import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { BudgetTarget } from './entities/budget-target.entity';
import { BudgetTargetService } from './services/budget-target.service';
import { BudgetTargetController } from './controllers/budget-target.controller';
import { ExchangeRateModule } from '@/exchange-rate/exchange-rate.module';

@Module({
  imports: [MikroOrmModule.forFeature([BudgetTarget]), ExchangeRateModule],
  providers: [BudgetTargetService],
  controllers: [BudgetTargetController],
  exports: [BudgetTargetService],
})
export class BudgetTargetModule {}
