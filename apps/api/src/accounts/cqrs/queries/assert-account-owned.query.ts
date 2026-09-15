import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Account } from '@prisma/client';
import { AccountsService } from '../../accounts.service';

/**
 * Проверяет, что счёт существует и принадлежит пользователю; иначе NotFoundException.
 * Так чужие модули (`transactions`) обращаются к счетам, не инжектя `AccountsService`.
 */
export class AssertAccountOwnedQuery {
  /**
   * @param accountId Проверяемый счёт.
   * @param userId Предполагаемый владелец — всегда из JWT.
   */
  constructor(
    public readonly accountId: string,
    public readonly userId: string,
  ) {}
}

/** Обработчик {@link AssertAccountOwnedQuery}; регистрируется в `AccountsModule`. */
@QueryHandler(AssertAccountOwnedQuery)
export class AssertAccountOwnedHandler implements IQueryHandler<AssertAccountOwnedQuery, Account> {
  constructor(private readonly accountsService: AccountsService) {}

  /**
   * Делегирует в `AccountsService.findOne`, который и выполняет проверку владельца.
   *
   * @param query Идентификаторы счёта и пользователя.
   * @returns Найденный счёт (вызывающей стороне обычно нужен только факт успеха).
   * @throws {NotFoundException} Счёта нет или он принадлежит другому пользователю.
   */
  execute(query: AssertAccountOwnedQuery): Promise<Account> {
    return this.accountsService.findOne(query.accountId, query.userId);
  }
}
