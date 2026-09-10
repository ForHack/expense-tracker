import Link from 'next/link';
import type { ReactNode } from 'react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Обзор' },
  { href: '/transactions', label: 'Транзакции' },
  { href: '/accounts', label: 'Счета' },
  { href: '/categories', label: 'Категории' },
  { href: '/budgets', label: 'Бюджеты' },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-black/10 p-4 dark:border-white/10">
        <div className="mb-6 text-lg font-semibold">Expense Tracker</div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
