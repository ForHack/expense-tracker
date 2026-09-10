import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedUser } from '../types/jwt-payload';

/**
 * Достаёт пользователя из запроса: `@CurrentUser()` — весь объект,
 * `@CurrentUser('id')` — конкретное поле.
 */
export const CurrentUser = createParamDecorator(
  (field: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request & { user: AuthenticatedUser }>();
    return field ? request.user?.[field] : request.user;
  },
);