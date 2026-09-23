import type { TransactionsSummary } from '@expense-tracker/shared-types';
import { ArrowDownLeftIcon, ArrowUpRightIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatMoney, formatMonth } from '@/shared/lib/format';

/**
 * Итоги за календарный месяц из `GET /transactions/summary`.
 * `TRANSFER` в эти суммы не входит — это перемещение между своими счетами.
 *
 * Композиция асимметричная: баланс живёт в крупном тёмном блоке с полосой
 * «сколько дохода уже потрачено», доход и расход — компактными карточками справа.
 */
export function MonthSummary({
  summary,
  currency,
}: {
  summary: TransactionsSummary;
  currency: string;
}) {
  const income = Number(summary.income);
  const expense = Number(summary.expense);
  const isNegative = Number(summary.balance) < 0;

  // Доход может быть нулевым (или NaN при битой строке) — полосу тогда просто не рисуем
  const spentShare =
    Number.isFinite(income) && income > 0 && Number.isFinite(expense)
      ? Math.min(Math.round((expense / income) * 100), 100)
      : null;

  const month = formatMonth(summary.month, summary.year);

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <h2 className="sr-only">Сводка за {month}</h2>

      <article className="shadow-soft bg-hatch relative flex flex-col justify-between overflow-hidden rounded-3xl bg-primary p-7 text-primary-foreground lg:col-span-2">
        <p className="eyebrow text-primary-foreground/60">Баланс · {month}</p>

        <p
          // Минус на тёмном фоне подсвечиваем светлой розой: --destructive здесь неразличим
          className={`display-title tnum mt-5 text-4xl sm:text-6xl ${isNegative ? 'text-rose-300' : ''}`}
        >
          {formatMoney(summary.balance, currency)}
        </p>

        {spentShare !== null && (
          <div className="mt-10">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-primary-foreground/15">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-700"
                style={{ width: `${spentShare}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-primary-foreground/70">
              Потрачено <span className="font-semibold text-primary-foreground">{spentShare}%</span>{' '}
              дохода за месяц
            </p>
          </div>
        )}
      </article>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <SummaryTile
          label="Доходы"
          value={formatMoney(summary.income, currency)}
          icon={<ArrowDownLeftIcon className="size-4" />}
          valueClassName="text-positive"
          iconClassName="bg-accent text-accent-foreground"
        />
        <SummaryTile
          label="Расходы"
          value={formatMoney(summary.expense, currency)}
          icon={<ArrowUpRightIcon className="size-4" />}
          valueClassName="text-destructive"
          iconClassName="bg-secondary text-secondary-foreground"
        />
      </div>
    </section>
  );
}

function SummaryTile({
  label,
  value,
  icon,
  valueClassName,
  iconClassName,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  valueClassName: string;
  iconClassName: string;
}) {
  return (
    <article className="shadow-soft flex flex-col justify-between gap-6 rounded-3xl bg-card p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow text-muted-foreground">{label}</p>
        <span className={`flex size-9 items-center justify-center rounded-full ${iconClassName}`}>
          {icon}
        </span>
      </div>

      <p className={`display-title tnum text-2xl ${valueClassName}`}>{value}</p>
    </article>
  );
}
