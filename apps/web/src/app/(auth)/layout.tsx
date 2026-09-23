import { ArrowUpRightIcon, TrendingUpIcon, WalletIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Раскладка входа и регистрации: слева — тёмный постер с обещанием продукта,
 * справа — форма. На узких экранах постер скрывается, остаётся только форма.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen p-3 sm:p-5">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1560px] gap-5 sm:min-h-[calc(100vh-2.5rem)] lg:grid-cols-2">
        <aside className="shadow-soft bg-hatch relative hidden flex-col justify-between overflow-hidden rounded-[2rem] bg-primary p-10 text-primary-foreground lg:flex">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-primary-foreground text-lg font-extrabold text-primary">
              ₽
            </span>
            <span className="eyebrow text-primary-foreground/70">Expense Tracker</span>
          </div>

          <div>
            <h2 className="display-title text-5xl xl:text-6xl">
              Считай
              <br />
              каждую
              <br />
              <span className="display-mark">трату!</span>
            </h2>
            <p className="mt-7 max-w-sm text-primary-foreground/70">
              Доходы, расходы и бюджеты в одном месте — без таблиц и записок на полях.
            </p>
          </div>

          <ul className="flex flex-wrap gap-3">
            {[
              { icon: WalletIcon, label: 'Счета и карты' },
              { icon: ArrowUpRightIcon, label: 'Категории трат' },
              { icon: TrendingUpIcon, label: 'Итоги месяца' },
            ].map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2 text-sm font-medium"
              >
                <Icon className="size-4" />
                {label}
              </li>
            ))}
          </ul>
        </aside>

        <div className="flex items-center justify-center px-2 py-10 sm:px-8">{children}</div>
      </div>
    </div>
  );
}
