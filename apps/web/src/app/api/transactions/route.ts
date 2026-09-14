import type { Transaction } from '@expense-tracker/shared-types';
import { NextResponse } from 'next/server';
import { getSessionToken } from '@/entities/session';
// Импорты напрямую, а не из барелей: features/create-transaction тянет 'use client'-формы,
// а shared/api/route-error — next/server.
import { createTransactionSchema } from '@/features/create-transaction/model/schemas';
import { api } from '@/shared/api';
import { toErrorResponse, toValidationResponse } from '@/shared/api/route-error';

/**
 * Прокси к POST /api/transactions в Nest: браузер не видит httpOnly-cookie с токеном,
 * поэтому Authorization подставляет сервер.
 */
export async function POST(request: Request) {
  const parsed = createTransactionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return toValidationResponse(parsed.error.issues.map((issue) => issue.message));
  }

  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ statusCode: 401, message: 'Нет сессии' }, { status: 401 });
  }

  try {
    const transaction = await api.post<Transaction>('/transactions', parsed.data, { token });
    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
