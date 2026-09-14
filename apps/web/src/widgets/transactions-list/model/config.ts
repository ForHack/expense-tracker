/** Размер страницы списка транзакций на дашборде. Уезжает в `perPage` запроса к Nest. */
export const TRANSACTIONS_PER_PAGE = 10;

export interface TransactionListFilters {
  type?: string;
  categoryId?: string;
}

/**
 * Ссылка на страницу списка с сохранением фильтров: их потеря при перелистывании —
 * самая частая ошибка такой пагинации. Первая страница пишется без `page`, чтобы
 * адрес по умолчанию был чистым.
 */
export function buildTransactionsHref(
  pathname: string,
  page: number,
  { type, categoryId }: TransactionListFilters,
): string {
  const params = new URLSearchParams();
  if (type) {
    params.set('type', type);
  }
  if (categoryId) {
    params.set('categoryId', categoryId);
  }
  if (page > 1) {
    params.set('page', String(page));
  }

  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}
