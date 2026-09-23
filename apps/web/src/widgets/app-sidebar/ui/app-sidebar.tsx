import type { User } from '@expense-tracker/shared-types';
import { LogoutButton } from '@/features/auth';
import { SidebarNav } from './sidebar-nav';

/**
 * Узкая вертикальная «рейка» с иконками: логотип сверху, навигация по центру,
 * выход снизу. Подписи появляются всплывающей плашкой при наведении —
 * см. `SidebarNav`, которому нужен `usePathname` для активного пункта.
 */
export function AppSidebar({ user }: { user: User }) {
  const initial = (user.name ?? user.email).trim().charAt(0).toUpperCase();

  return (
    <aside className="shadow-soft sticky top-0 flex h-[calc(100vh-1.5rem)] w-20 shrink-0 flex-col items-center rounded-[2rem] bg-sidebar py-6 sm:h-[calc(100vh-2.5rem)]">
      <div
        className="flex size-11 items-center justify-center rounded-2xl bg-foreground text-lg font-extrabold text-background"
        aria-hidden
      >
        ₽
      </div>
      <span className="sr-only">Expense Tracker</span>

      <SidebarNav />

      <div className="mt-auto flex flex-col items-center gap-3">
        <div
          className="flex size-10 items-center justify-center rounded-full bg-accent font-display text-sm font-bold text-accent-foreground"
          title={user.name ?? user.email}
        >
          {initial}
        </div>
        <LogoutButton />
      </div>
    </aside>
  );
}
