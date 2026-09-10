import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { AccountsCqrsHandlers } from './cqrs';

@Module({
  imports: [CqrsModule],
  controllers: [AccountsController],
  providers: [AccountsService, ...AccountsCqrsHandlers],
})
export class AccountsModule {}
