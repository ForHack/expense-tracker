/** Единый список путей: используется в middleware, редиректах и навигации. */
export const ROUTES = {
  login: '/login',
  register: '/register',
  dashboard: '/dashboard',
  transactions: '/transactions',
  accounts: '/accounts',
  categories: '/categories',
  budgets: '/budgets',
} as const;

/** Route Handlers Next, через которые проходит работа с сессией. */
export const AUTH_ROUTES = {
  login: '/api/auth/login',
  register: '/api/auth/register',
  logout: '/api/auth/logout',
} as const;

/** Страницы, доступные без сессии. Всё остальное middleware уводит на /login. */
export const PUBLIC_ROUTES: string[] = [ROUTES.login, ROUTES.register];
