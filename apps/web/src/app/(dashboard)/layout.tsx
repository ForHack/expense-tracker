import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getCurrentUser } from '@/entities/session';
import { ROUTES } from '@/shared/config';
import { AppSidebar } from '@/widgets/app-sidebar';

/**
 * Middleware отсекает запросы без cookie, но токен мог быть отозван или истечь между
 * проверками — поэтому здесь сессия подтверждается реальным запросом к GET /auth/me.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(ROUTES.login);
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar user={user} />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
