import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

/**
 * Домен транзакций. `CqrsModule` нужен ради `QueryBus`, которым сервис проверяет
 * принадлежность счёта и категории; сами handler-ы регистрируют модули-владельцы.
 * `PrismaService` доступен без импорта — `PrismaModule` помечен `@Global`.
 */
@Module({
  imports: [CqrsModule],
  controllers: [TransactionsController],
  providers: [TransactionsService],
})
export class TransactionsModule {}
