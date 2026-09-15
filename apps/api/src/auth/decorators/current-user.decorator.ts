import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedUser } from '../types/jwt-payload';

/**
 * Достаёт пользователя из запроса: `@CurrentUser()` — весь объект,
 * `@CurrentUser('id')` — конкретное поле. Объект в `request.user` кладёт `JwtStrategy`,
 * поэтому под глобальным `JwtAuthGuard` он есть на любом непубличном маршруте.
 *
 * @param field Имя поля `AuthenticatedUser` либо `undefined` — вернуть объект целиком.
 * @param ctx Контекст выполнения Nest, из которого берётся HTTP-запрос.
 * @returns Значение поля, весь `AuthenticatedUser` или `undefined`, если запрос не аутентифицирован.
 * @throws Ничего не бросает: отсутствие пользователя — это `undefined`, доступ закрывает guard.
 */
export const CurrentUser = createParamDecorator(
  (field: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request & { user: AuthenticatedUser }>();
    return field ? request.user?.[field] : request.user;
  },
);
