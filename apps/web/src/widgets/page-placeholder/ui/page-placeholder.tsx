import { ConstructionIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Заглушка нереализованного раздела: крупный заголовок в стиле дашборда
 * и карточка с описанием будущего экрана. `title` разбивается на две части,
 * вторая подсвечивается лаймовым маркером — как заголовки на остальных экранах.
 */
export function PagePlaceholder({
  eyebrow,
  title,
  highlight,
  children,
}: {
  eyebrow: string;
  title: string;
  highlight: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-5">
      <header>
        <p className="eyebrow text-muted-foreground">{eyebrow}</p>
        <h1 className="display-title mt-3 text-4xl sm:text-5xl">
          {title} <span className="display-mark">{highlight}</span>
        </h1>
      </header>

      <div className="shadow-soft flex max-w-2xl items-start gap-4 rounded-3xl bg-card p-7">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <ConstructionIcon className="size-5" />
        </span>
        <div>
          <p className="font-semibold">Раздел в работе</p>
          <p className="mt-1 text-sm text-muted-foreground">{children}</p>
        </div>
      </div>
    </section>
  );
}
