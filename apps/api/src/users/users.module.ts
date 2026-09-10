import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { UsersCqrsHandlers } from './cqrs';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [CqrsModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, ...UsersCqrsHandlers],
})
export class UsersModule {}
