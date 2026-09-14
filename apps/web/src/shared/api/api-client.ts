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

export interface ApiRequestOptions extends Omit<RequestInit, 'method' | 'body'> {
  /**
   * Access-токен для заголовка Authorization. Передаётся явно: токен живёт в httpOnly-cookie,
   * которую читает только серверный код (см. entities/session), поэтому модульного состояния здесь нет.
   */
  token?: string | null;
}

/** Тонкая обёртка над fetch к Nest API: собирает URL, ставит заголовки, разворачивает ошибки. */
export async function apiFetch<T>(
  path: string,
  { token, ...init }: ApiRequestOptions & { method?: string; body?: BodyInit } = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  get: <T>(path: string, options?: ApiRequestOptions) => apiFetch<T>(path, options),
  post: <T>(path: string, body: unknown, options?: ApiRequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown, options?: ApiRequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string, options?: ApiRequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'DELETE' }),
};
