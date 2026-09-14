import type { User } from '@expense-tracker/shared-types';
import { cache } from 'react';
import { api, ApiRequestError } from '@/shared/api';
import { getSessionToken } from '../model/session-cookie';

/**
 * Текущий пользователь по токену из cookie. Возвращает null, если сессии нет или она
 * отвергнута API (истёкший токен) — вызывающий сам решает, редиректить или нет.
 *
 * Обёрнут в `cache()`: layout дашборда и страница внутри него зовут его в одном рендере,
 * и без мемоизации получилось бы два запроса `GET /auth/me`.
 */
export const getCurrentUser = cache(async function getCurrentUser(): Promise<User | null> {
  const token = await getSessionToken();
  if (!token) {
    return null;
  }

  try {
    return await api.get<User>('/auth/me', { token, cache: 'no-store' });
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) {
      return null;
    }
    throw error;
  }
});
