import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Category } from '@prisma/client';
import { CategoriesService } from '../../categories.service';

/**
 * Проверяет, что категория существует и принадлежит пользователю; иначе NotFoundException.
 * Так чужие модули (`transactions`, `budgets`) обращаются к категориям,
 * не инжектя `CategoriesService`.
 */
export class AssertCategoryOwnedQuery {
  /**
   * @param categoryId Проверяемая категория.
   * @param userId Предполагаемый владелец — всегда из JWT.
   */
  constructor(
    public readonly categoryId: string,
    public readonly userId: string,
  ) {}
}

/** Обработчик {@link AssertCategoryOwnedQuery}; регистрируется в `CategoriesModule`. */
@QueryHandler(AssertCategoryOwnedQuery)
export class AssertCategoryOwnedHandler implements IQueryHandler<
  AssertCategoryOwnedQuery,
  Category
> {
  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * Делегирует в `CategoriesService.findOne`, который и выполняет проверку владельца.
   *
   * @param query Идентификаторы категории и пользователя.
   * @returns Найденную категорию (вызывающей стороне обычно нужен только факт успеха).
   * @throws {NotFoundException} Категории нет или она принадлежит другому пользователю.
   */
  execute(query: AssertCategoryOwnedQuery): Promise<Category> {
    return this.categoriesService.findOne(query.categoryId, query.userId);
  }
}
