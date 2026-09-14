/**
 * Чистая часть модели сессии: имя cookie и разбор JWT.
 * Здесь намеренно нет ни `next/headers`, ни Node-API — файл импортируется из middleware,
 * который исполняется в edge-рантайме.
 */

export const SESSION_COOKIE = 'access_token';

/**
 * Читает payload JWT **без проверки подписи** — только чтобы узнать `exp`.
 * Доверять этим данным нельзя: подлинность токена проверяет Nest.
 */
export function readTokenExpiry(token: string): number | null {
  const payload = token.split('.')[1];
  if (!payload) {
    return null;
  }

  try {
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as {
      exp?: unknown;
    };
    return typeof json.exp === 'number' ? json.exp : null;
  } catch {
    return null;
  }
}

/** true, если токен просрочен по собственному `exp`. Токен без `exp` считаем живым. */
export function isTokenExpired(token: string, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  const exp = readTokenExpiry(token);
  return exp !== null && exp <= nowSeconds;
}
