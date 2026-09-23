'use client';

import type { Category, TransactionType } from '@expense-tracker/shared-types';
import { XIcon } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';
import {
  ALL_FILTER_VALUE,
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_LABELS,
} from '@/entities/transaction';
import { Button } from '@/shared/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';

export interface TransactionFiltersProps {
  categories: Category[];
  type?: TransactionType;
  categoryId?: string;
}

/**
 * Фильтры списка живут в URL, а не в состоянии: сервер перечитывает `searchParams` и
 * отдаёт новую страницу. Текущие значения приходят пропами от Server Component —
 * `useSearchParams` не нужен, как и оборачивающий Suspense.
 */
export function TransactionFilters({ categories, type, categoryId }: TransactionFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function applyFilters(next: { type?: string; categoryId?: string }) {
    const params = new URLSearchParams();
    const nextType = next.type ?? type;
    const nextCategoryId = next.categoryId ?? categoryId;

    if (nextType && nextType !== ALL_FILTER_VALUE) {
      params.set('type', nextType);
    }
    if (nextCategoryId && nextCategoryId !== ALL_FILTER_VALUE) {
      params.set('categoryId', nextCategoryId);
    }
    // `page` намеренно не переносим: после смены фильтра страница 5 почти наверняка пуста

    const search = params.toString();
    startTransition(() => router.push(search ? `${pathname}?${search}` : pathname));
  }

  const hasFilters = Boolean(type || categoryId);

  return (
    <div className="flex flex-wrap items-center gap-2" data-pending={isPending || undefined}>
      <Select
        value={type ?? ALL_FILTER_VALUE}
        onValueChange={(value) => applyFilters({ type: value })}
      >
        <SelectTrigger className="w-44 rounded-full" aria-label="Тип транзакции">
          <SelectValue placeholder="Тип" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_FILTER_VALUE}>Все типы</SelectItem>
          {TRANSACTION_TYPES.map((value) => (
            <SelectItem key={value} value={value}>
              {TRANSACTION_TYPE_LABELS[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={categoryId ?? ALL_FILTER_VALUE}
        onValueChange={(value) => applyFilters({ categoryId: value })}
      >
        <SelectTrigger className="w-56 rounded-full" aria-label="Категория">
          <SelectValue placeholder="Категория" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_FILTER_VALUE}>Все категории</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => applyFilters({ type: ALL_FILTER_VALUE, categoryId: ALL_FILTER_VALUE })}
        >
          <XIcon />
          Сбросить
        </Button>
      )}
    </div>
  );
}
