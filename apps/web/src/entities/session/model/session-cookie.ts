import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import { SESSION_COOKIE, readTokenExpiry } from './token';

/** Запасной срок жизни, если в токене нет `exp` (JWT_EXPIRES_IN по умолчанию — 15m). */
const FALLBACK_MAX_AGE_SECONDS = 15 * 60;

const BASE_COOKIE = {
  name: SESSION_COOKIE,
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
} as const;

/**
 * httpOnly-cookie: JS страницы её не читает, поэтому токен не украсть через XSS.
 * sameSite=lax достаточно — Nest вызывается только из наших же Route Handlers.
 */
export function setSessionCookie(response: NextResponse, token: string): void {
  const exp = readTokenExpiry(token);
  const maxAge = exp ? Math.max(exp - Math.floor(Date.now() / 1000), 0) : FALLBACK_MAX_AGE_SECONDS;

  response.cookies.set({ ...BASE_COOKIE, value: token, maxAge });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({ ...BASE_COOKIE, value: '', maxAge: 0 });
}

/** Токен из cookie. Доступен только в серверном коде (Server Components, Route Handlers). */
export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}
