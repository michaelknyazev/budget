import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Deposit } from './entities/deposit.entity';
import { DepositService } from './services/deposit.service';
import { DepositController } from './controllers/deposit.controller';

@Module({
  imports: [MikroOrmModule.forFeature([Deposit])],
  providers: [DepositService],
  controllers: [DepositController],
  exports: [DepositService],
})
export class DepositModule {}
