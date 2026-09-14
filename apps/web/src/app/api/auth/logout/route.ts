import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/entities/session';

/**
 * Выход — чисто локальная операция: refresh-токенов и серверных сессий в API нет,
 * поэтому достаточно погасить cookie. Сам JWT доживёт свой срок, но уже никуда не уйдёт.
 */
export async function POST() {
  const response = new NextResponse(null, { status: 204 });
  clearSessionCookie(response);
  return response;
}
