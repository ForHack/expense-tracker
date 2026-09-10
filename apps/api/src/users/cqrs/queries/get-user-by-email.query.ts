import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { User } from '@prisma/client';
import { UsersRepository } from '../../users.repository';

/** Возвращает пользователя **с** passwordHash — предназначено только для AuthService. */
export class GetUserByEmailQuery {
  constructor(public readonly email: string) {}
}

@QueryHandler(GetUserByEmailQuery)
export class GetUserByEmailHandler implements IQueryHandler<GetUserByEmailQuery, User | null> {
  constructor(private readonly usersRepository: UsersRepository) {}

  execute(query: GetUserByEmailQuery): Promise<User | null> {
    return this.usersRepository.findByEmailWithHash(query.email);
  }
}
