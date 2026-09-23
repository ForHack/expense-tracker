import type { Metadata } from 'next';
import { Onest, Unbounded } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

/** Заголовки и крупные суммы — тяжёлый геометрический гротеск. */
const unbounded = Unbounded({
  subsets: ['latin', 'cyrillic'],
  weight: ['600', '700', '800'],
  variable: '--font-unbounded',
  display: 'swap',
});

/** Основной текст интерфейса. */
const onest = Onest({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-onest',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Expense Tracker',
  description: 'Учёт личных доходов и расходов',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" className={`${unbounded.variable} ${onest.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
