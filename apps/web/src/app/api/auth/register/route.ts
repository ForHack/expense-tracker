import type { AuthResponse } from '@expense-tracker/shared-types';
import { NextResponse } from 'next/server';
import { setSessionCookie } from '@/entities/session';
import { registerPayloadSchema } from '@/features/auth/model/schemas';
import { api } from '@/shared/api';
import { toErrorResponse, toValidationResponse } from '@/shared/api/route-error';

/** Прокси к POST /api/auth/register в Nest: сразу открывает сессию, как и login. */
export async function POST(request: Request) {
  const parsed = registerPayloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return toValidationResponse(parsed.error.issues.map((issue) => issue.message));
  }

  try {
    const auth = await api.post<AuthResponse>('/auth/register', parsed.data);
    const response = NextResponse.json(auth.user, { status: 201 });
    setSessionCookie(response, auth.accessToken);
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}
