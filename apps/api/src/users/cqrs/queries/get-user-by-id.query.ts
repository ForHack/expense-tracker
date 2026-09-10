import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { SafeUser, UsersService } from '../../users.service';

export class GetUserByIdQuery {
  constructor(public readonly id: string) {}
}

@QueryHandler(GetUserByIdQuery)
export class GetUserByIdHandler implements IQueryHandler<GetUserByIdQuery, SafeUser> {
  constructor(private readonly usersService: UsersService) {}

  /** Бросает NotFoundException, если пользователя нет. */
  execute(query: GetUserByIdQuery): Promise<SafeUser> {
    return this.usersService.findOne(query.id);
  }
}
