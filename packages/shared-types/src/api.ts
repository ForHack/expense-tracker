import type { TransactionType } from './enums';

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PaginationQuery {
  page?: number;
  perPage?: number;
}

/** Сумма по одной категории за месяц; `categoryId: null` — транзакции без категории. */
export interface SummaryCategoryTotal {
  categoryId: string | null;
  name: string | null;
  type: TransactionType;
  total: string;
}

/**
 * Ответ GET /transactions/summary. Суммы — строки (Decimal).
 * `TRANSFER` не входит в income/expense/balance, но встречается в `byCategory`.
 */
export interface TransactionsSummary {
  month: number;
  year: number;
  income: string;
  expense: string;
  balance: string;
  byCategory: SummaryCategoryTotal[];
}
