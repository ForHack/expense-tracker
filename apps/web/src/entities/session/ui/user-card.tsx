import type { User } from '@expense-tracker/shared-types';
import { UserRoundIcon } from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/card';

/** Профиль на дашборде. Чистый компонент: данные приходят пропом из Server Component. */
export function UserCard({ user }: { user: User }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted">
          <UserRoundIcon className="size-5 text-muted-foreground" />
        </div>

        <div className="min-w-0">
          <div className="truncate font-medium">{user.name ?? 'Без имени'}</div>
          <div className="truncate text-sm text-muted-foreground">{user.email}</div>
        </div>

        <div className="ml-auto text-right text-sm text-muted-foreground">
          <div>Валюта</div>
          <div className="font-medium text-foreground">{user.currency}</div>
        </div>
      </CardContent>
    </Card>
  );
}
