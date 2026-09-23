'use client';

import {
  ArrowLeftRightIcon,
  LayoutGridIcon,
  ShapesIcon,
  TargetIcon,
  WalletIcon,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ROUTES } from '@/shared/config';
import { cn } from '@/shared/lib/utils';

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: ROUTES.dashboard, label: 'Обзор', icon: LayoutGridIcon },
  { href: ROUTES.transactions, label: 'Транзакции', icon: ArrowLeftRightIcon },
  { href: ROUTES.accounts, label: 'Счета', icon: WalletIcon },
  { href: ROUTES.categories, label: 'Категории', icon: ShapesIcon },
  { href: ROUTES.budgets, label: 'Бюджеты', icon: TargetIcon },
];

/** Активный пункт определяется по пути, поэтому компонент клиентский. */
export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-10 flex flex-col items-center gap-2" aria-label="Разделы">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'group relative flex size-12 items-center justify-center rounded-2xl transition-all',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
            )}
          >
            <Icon className="size-5" />

            {/* Подпись выезжает справа — рейка остаётся узкой, а навигация читаемой */}
            <span className="pointer-events-none absolute left-full z-20 ml-3 origin-left scale-90 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-background opacity-0 transition-all duration-150 group-hover:scale-100 group-hover:opacity-100">
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
