import type { ApiError } from '@expense-tracker/shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly payload: ApiError | null,
  ) {
    super(
      Array.isArray(payload?.message)
        ? payload.message.join(', ')
        : (payload?.message ?? `Запрос завершился со статусом ${status}`),
    );
    this.name = 'ApiRequestError';
  }
}

let accessToken: string | null = null;

/**
 * Токен держим в модульной переменной, чтобы клиент не зависел от способа хранения
 * (cookie, localStorage, серверный контекст) — вызывающий код сам решает, откуда его взять.
 */
export function setAuthToken(token: string | null): void {
  accessToken = token;
}

export function getAuthToken(): string | null {
  return accessToken;
}

/** Тонкая обёртка над fetch: собирает URL, ставит заголовки, разворачивает ошибки. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
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

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};
