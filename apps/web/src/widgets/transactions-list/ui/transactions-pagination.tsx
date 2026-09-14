import type { PaginationMeta } from '@expense-tracker/shared-types';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import Link from 'next/link';
import { buttonVariants } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';

export interface TransactionsPaginationProps {
  meta: PaginationMeta;
  /** Действующие фильтры — переносим их в ссылки, иначе перелистывание сбросит выборку. */
  filters: { type?: string; categoryId?: string };
  pathname: string;
}

/**
 * Пагинация на обычных ссылках, а не на кнопках с router.push: страница рендерится
 * на сервере, поэтому переход работает и без JS, и адрес всегда отражает состояние списка.
 */
export function TransactionsPagination({ meta, filters, pathname }: TransactionsPaginationProps) {
  const totalPages = Math.max(meta.totalPages, 1);

  function hrefForPage(page: number): string {
    const params = new URLSearchParams();
    if (filters.type) {
      params.set('type', filters.type);
    }
    if (filters.categoryId) {
      params.set('categoryId', filters.categoryId);
    }
    if (page > 1) {
      params.set('page', String(page));
    }
    const search = params.toString();
    return search ? `${pathname}?${search}` : pathname;
  }

  const hasPrev = meta.page > 1;
  const hasNext = meta.page < totalPages;
  const linkClass = buttonVariants({ variant: 'outline', size: 'sm' });
  const disabledClass = 'pointer-events-none opacity-50';

  return (
    <nav className="flex items-center justify-between gap-4" aria-label="Страницы транзакций">
      <p className="text-sm text-muted-foreground">
        Всего: {meta.total} · Стр. {meta.page} из {totalPages}
      </p>

      <div className="flex gap-2">
        <Link
          href={hrefForPage(meta.page - 1)}
          className={cn(linkClass, !hasPrev && disabledClass)}
          aria-disabled={!hasPrev}
          tabIndex={hasPrev ? undefined : -1}
        >
          <ChevronLeftIcon />
          Назад
        </Link>
        <Link
          href={hrefForPage(meta.page + 1)}
          className={cn(linkClass, !hasNext && disabledClass)}
          aria-disabled={!hasNext}
          tabIndex={hasNext ? undefined : -1}
        >
          Вперёд
          <ChevronRightIcon />
        </Link>
      </div>
    </nav>
  );
}
