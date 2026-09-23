import type { User } from '@expense-tracker/shared-types';

/**
 * Профиль в шапке дашборда: аватар-инициал, имя и валюта счёта.
 * Чистый компонент — данные приходят пропом из Server Component.
 */
export function UserCard({ user }: { user: User }) {
  const name = user.name ?? 'Без имени';
  const initial = (user.name ?? user.email).trim().charAt(0).toUpperCase();

  return (
    <div className="shadow-soft flex items-center gap-3 rounded-full bg-card py-2 pr-2 pl-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary font-display text-sm font-bold text-primary-foreground">
        {initial}
      </div>

      <div className="min-w-0 pr-1">
        <div className="truncate text-sm font-semibold">{name}</div>
        <div className="truncate text-xs text-muted-foreground">{user.email}</div>
      </div>

      <span className="eyebrow rounded-full bg-accent px-3 py-2 text-accent-foreground">
        {user.currency}
      </span>
    </div>
  );
}
