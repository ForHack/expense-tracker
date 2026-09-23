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
    <div className="min-h-screen p-3 sm:p-5">
      <div className="mx-auto flex max-w-[1560px] gap-4 sm:gap-5">
        <AppSidebar user={user} />
        <main className="min-w-0 flex-1 pb-6">{children}</main>
      </div>
    </div>
  );
}
