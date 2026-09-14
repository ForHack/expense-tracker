import type { AuthResponse } from '@expense-tracker/shared-types';
import { NextResponse } from 'next/server';
import { setSessionCookie } from '@/entities/session';
import { loginSchema } from '@/features/auth/model/schemas';
import { api } from '@/shared/api';
import { toErrorResponse, toValidationResponse } from '@/shared/api/route-error';

/**
 * Прокси к POST /api/auth/login в Nest: access-токен остаётся на сервере и уезжает
 * в httpOnly-cookie, а клиенту возвращается только профиль пользователя.
 */
export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return toValidationResponse(parsed.error.issues.map((issue) => issue.message));
  }

  try {
    const auth = await api.post<AuthResponse>('/auth/login', parsed.data);
    const response = NextResponse.json(auth.user);
    setSessionCookie(response, auth.accessToken);
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}
