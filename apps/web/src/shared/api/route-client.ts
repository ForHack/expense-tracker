import type { ApiError } from '@expense-tracker/shared-types';
import { ApiRequestError } from './api-client';

/**
 * Клиент для собственных Route Handlers Next (`/api/*`), а не для Nest.
 * Нужен там, где токен лежит в httpOnly-cookie: браузер не может подставить Authorization,
 * зато cookie на свой же origin уходит автоматически.
 */
export async function routeFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiError | null;
    throw new ApiRequestError(response.status, payload);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
