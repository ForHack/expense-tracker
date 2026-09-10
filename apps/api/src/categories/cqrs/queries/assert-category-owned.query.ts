import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Category } from '@prisma/client';
import { CategoriesService } from '../../categories.service';

/** Проверяет, что категория существует и принадлежит пользователю; иначе NotFoundException. */
export class AssertCategoryOwnedQuery {
  constructor(
    public readonly categoryId: string,
    public readonly userId: string,
  ) {}
}

@QueryHandler(AssertCategoryOwnedQuery)
export class AssertCategoryOwnedHandler
  implements IQueryHandler<AssertCategoryOwnedQuery, Category>
{
  constructor(private readonly categoriesService: CategoriesService) {}

  execute(query: AssertCategoryOwnedQuery): Promise<Category> {
    return this.categoriesService.findOne(query.categoryId, query.userId);
  }
}
