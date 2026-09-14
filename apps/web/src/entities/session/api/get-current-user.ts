import type { User } from '@expense-tracker/shared-types';
import { api, ApiRequestError } from '@/shared/api';
import { getSessionToken } from '../model/session-cookie';

/**
 * Текущий пользователь по токену из cookie. Возвращает null, если сессии нет или она
 * отвергнута API (истёкший токен) — вызывающий сам решает, редиректить или нет.
 */
export async function getCurrentUser(): Promise<User | null> {
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
}
