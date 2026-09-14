import type { ApiError } from '@expense-tracker/shared-types';
import { NextResponse } from 'next/server';
import { ApiRequestError } from './api-client';

/**
 * Превращает ошибку вызова Nest в ответ Route Handler, сохраняя статус и текст:
 * тогда форма на клиенте покажет сообщение от API (409 «email занят», 401 «неверный пароль»).
 * Всё неожидаемое пробрасываем как 502 — это сбой связки Next↔Nest, а не ошибка пользователя.
 */
export function toErrorResponse(error: unknown): NextResponse<ApiError> {
  if (error instanceof ApiRequestError) {
    return NextResponse.json<ApiError>(
      error.payload ?? { statusCode: error.status, message: error.message },
      { status: error.status },
    );
  }

  return NextResponse.json<ApiError>(
    { statusCode: 502, message: 'Сервис недоступен, попробуйте позже' },
    { status: 502 },
  );
}

/** Ответ 400 с сообщениями валидации — формат тот же, что у ValidationPipe в Nest. */
export function toValidationResponse(messages: string[]): NextResponse<ApiError> {
  return NextResponse.json<ApiError>(
    { statusCode: 400, message: messages, error: 'Bad Request' },
    { status: 400 },
  );
}
