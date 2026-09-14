import type {
  PaginatedResponse,
  QuerySummaryDto,
  QueryTransactionsDto,
  TransactionsSummary,
  TransactionWithRelations,
} from '@expense-tracker/shared-types';
import { api } from '@/shared/api';

/**
 * Чтение транзакций из Nest. Токен передаётся аргументом, а не читается из cookie здесь:
 * иначе модуль потянул бы `next/headers` и баррель слайса стал бы непригоден для клиента.
 * Cookie разбирает вызывающий Server Component через `getSessionToken()`.
 */

/** Отбрасывает пустые фильтры: `?type=` Nest-овый `@IsEnum` не пропустит. */
function toSearchParams(query: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  }
  const search = params.toString();
  return search ? `?${search}` : '';
}

export function fetchTransactions(
  token: string,
  query: QueryTransactionsDto = {},
): Promise<PaginatedResponse<TransactionWithRelations>> {
  return api.get<PaginatedResponse<TransactionWithRelations>>(
    `/transactions${toSearchParams({ ...query })}`,
    { token, cache: 'no-store' },
  );
}

export function fetchSummary(
  token: string,
  { month, year }: QuerySummaryDto,
): Promise<TransactionsSummary> {
  return api.get<TransactionsSummary>(`/transactions/summary${toSearchParams({ month, year })}`, {
    token,
    cache: 'no-store',
  });
}
