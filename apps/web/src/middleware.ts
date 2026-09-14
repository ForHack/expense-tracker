import { NextResponse, type NextRequest } from 'next/server';
// Импорт напрямую, а не из барреля @/entities/session: тот тянет next/headers, недоступный в edge.
import { SESSION_COOKIE, isTokenExpired } from '@/entities/session/model/token';
import { PUBLIC_ROUTES, ROUTES } from '@/shared/config';

/**
 * Дешёвый фильтр до рендера: есть живая по `exp` cookie — пускаем, нет — уводим на /login.
 * Подпись токена здесь не проверяется; настоящая авторизация остаётся за Nest,
 * а слой дашборда дополнительно подтверждает сессию через GET /auth/me.
 */
export function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const hasSession = token !== undefined && !isTokenExpired(token);
  const { pathname, search } = request.nextUrl;
  const isPublic = PUBLIC_ROUTES.includes(pathname);

  if (hasSession && isPublic) {
    return NextResponse.redirect(new URL(ROUTES.dashboard, request.url));
  }

  if (!hasSession && !isPublic) {
    const loginUrl = new URL(ROUTES.login, request.url);
    if (pathname !== '/') {
      // Куда вернуть после входа — пригодится, когда появятся ссылки на конкретные записи
      loginUrl.searchParams.set('from', `${pathname}${search}`);
    }
    const response = NextResponse.redirect(loginUrl);
    if (token) {
      // Просроченную cookie гасим сразу, иначе она будет ходить с каждым запросом
      response.cookies.set({ name: SESSION_COOKIE, value: '', path: '/', maxAge: 0 });
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  /** Статику, favicon и собственные Route Handlers не трогаем — у них своя проверка. */
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
