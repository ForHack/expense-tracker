import type { CreateTransactionDto, Transaction } from '@expense-tracker/shared-types';
import { routeFetch } from '@/shared/api';
import { API_ROUTES } from '@/shared/config';

/**
 * Создание идёт в свой Route Handler, а не в Nest: токен лежит в httpOnly-cookie,
 * браузер не может подставить заголовок Authorization.
 */
export function createTransaction(payload: CreateTransactionDto): Promise<Transaction> {
  return routeFetch<Transaction>(API_ROUTES.transactions, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
