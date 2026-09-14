import type { ReactNode } from 'react';

/** Общая раскладка экранов входа и регистрации: карточка по центру, без сайдбара. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">{children}</div>
  );
}
