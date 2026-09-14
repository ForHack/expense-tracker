import type { Metadata } from 'next';
import { LoginPage } from '@/views/login';

export const metadata: Metadata = { title: 'Вход — Expense Tracker' };

/** Файлы в app/ — только точки входа роутинга: разметка живёт в слое views. */
export default LoginPage;
