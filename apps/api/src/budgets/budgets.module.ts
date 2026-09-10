import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { BudgetsController } from './budgets.controller';
import { BudgetsService } from './budgets.service';

@Module({
  imports: [CqrsModule],
  controllers: [BudgetsController],
  providers: [BudgetsService],
})
export class BudgetsModule {}
