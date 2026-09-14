import type { TransactionsSummary } from '@expense-tracker/shared-types';
import { ArrowDownLeftIcon, ArrowUpRightIcon, WalletIcon } from 'lucide-react';
import { formatMoney, formatMonth } from '@/shared/lib/format';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';

/**
 * Итоги за календарный месяц из `GET /transactions/summary`.
 * `TRANSFER` в эти суммы не входит — это перемещение между своими счетами.
 */
export function MonthSummary({
  summary,
  currency,
}: {
  summary: TransactionsSummary;
  currency: string;
}) {
  const items = [
    {
      label: 'Доходы',
      value: summary.income,
      icon: ArrowDownLeftIcon,
      className: 'text-emerald-600',
    },
    {
      label: 'Расходы',
      value: summary.expense,
      icon: ArrowUpRightIcon,
      className: 'text-rose-600',
    },
    {
      label: 'Баланс',
      value: summary.balance,
      icon: WalletIcon,
      className: Number(summary.balance) < 0 ? 'text-rose-600' : 'text-foreground',
    },
  ];

  return (
    <section>
      <h2 className="sr-only">Сводка за {formatMonth(summary.month, summary.year)}</h2>

      <div className="grid gap-4 sm:grid-cols-3">
        {items.map(({ label, value, icon: Icon, className }) => (
          <Card key={label}>
            <CardHeader>
              <CardDescription className="flex items-center gap-2">
                <Icon className="size-4" />
                {label}
              </CardDescription>
              <CardTitle className={`text-2xl ${className}`}>
                {formatMoney(value, currency)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {formatMonth(summary.month, summary.year)}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
