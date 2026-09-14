import type { User } from '@expense-tracker/shared-types';
import Link from 'next/link';
import { LogoutButton } from '@/features/auth';
import { ROUTES } from '@/shared/config';

const NAV_ITEMS = [
  { href: ROUTES.dashboard, label: 'Обзор' },
  { href: ROUTES.transactions, label: 'Транзакции' },
  { href: ROUTES.accounts, label: 'Счета' },
  { href: ROUTES.categories, label: 'Категории' },
  { href: ROUTES.budgets, label: 'Бюджеты' },
];

export function AppSidebar({ user }: { user: User }) {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r bg-sidebar p-4">
      <div className="mb-6 text-lg font-semibold">Expense Tracker</div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-4 border-t pt-4">
        <div className="truncate px-3 pb-2 text-sm font-medium">{user.name ?? user.email}</div>
        {user.name && (
          <div className="truncate px-3 pb-2 text-xs text-muted-foreground">{user.email}</div>
        )}
        <LogoutButton />
      </div>
    </aside>
  );
}
