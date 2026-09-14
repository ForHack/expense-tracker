import type { Category, TransactionType } from '@expense-tracker/shared-types';
import { api } from '@/shared/api';

/** Категории пользователя. Токен — аргументом, см. комментарий в entities/transaction/api. */
export function fetchCategories(
  token: string,
  query: { type?: TransactionType; parentId?: string } = {},
): Promise<Category[]> {
  const params = new URLSearchParams();
  if (query.type) {
    params.set('type', query.type);
  }
  if (query.parentId) {
    params.set('parentId', query.parentId);
  }
  const search = params.toString();

  return api.get<Category[]>(`/categories${search ? `?${search}` : ''}`, {
    token,
    cache: 'no-store',
  });
}
