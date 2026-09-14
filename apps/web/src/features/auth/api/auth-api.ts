import type { User } from '@expense-tracker/shared-types';
import { routeFetch } from '@/shared/api';
import { AUTH_ROUTES } from '@/shared/config';
import type { LoginFormValues, RegisterPayload } from '../model/schemas';

/**
 * Клиентские вызовы идут не в Nest напрямую, а в наши Route Handlers: только сервер
 * видит access-токен и кладёт его в httpOnly-cookie. Наружу отдаётся лишь профиль.
 */

export function login(values: LoginFormValues): Promise<User> {
  return routeFetch<User>(AUTH_ROUTES.login, { method: 'POST', body: JSON.stringify(values) });
}

export function register(payload: RegisterPayload): Promise<User> {
  return routeFetch<User>(AUTH_ROUTES.register, { method: 'POST', body: JSON.stringify(payload) });
}

export function logout(): Promise<void> {
  return routeFetch<void>(AUTH_ROUTES.logout, { method: 'POST' });
}
