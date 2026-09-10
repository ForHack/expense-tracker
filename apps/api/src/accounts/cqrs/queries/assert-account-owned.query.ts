import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Account } from '@prisma/client';
import { AccountsService } from '../../accounts.service';

/** Проверяет, что счёт существует и принадлежит пользователю; иначе NotFoundException. */
export class AssertAccountOwnedQuery {
  constructor(
    public readonly accountId: string,
    public readonly userId: string,
  ) {}
}

@QueryHandler(AssertAccountOwnedQuery)
export class AssertAccountOwnedHandler
  implements IQueryHandler<AssertAccountOwnedQuery, Account>
{
  constructor(private readonly accountsService: AccountsService) {}

  execute(query: AssertAccountOwnedQuery): Promise<Account> {
    return this.accountsService.findOne(query.accountId, query.userId);
  }
}
