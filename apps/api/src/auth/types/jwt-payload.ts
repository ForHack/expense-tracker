/** Полезная нагрузка access-токена. */
export interface JwtPayload {
  sub: string;
  email: string;
}

/** То, что стратегия кладёт в `request.user`. */
export interface AuthenticatedUser {
  id: string;
  email: string;
}
