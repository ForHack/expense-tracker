import type { Account } from '@expense-tracker/shared-types';
import { api } from '@/shared/api';

/** Счета пользователя. Токен — аргументом, см. комментарий в entities/transaction/api. */
export function fetchAccounts(token: string): Promise<Account[]> {
  return api.get<Account[]>('/accounts', { token, cache: 'no-store' });
}
