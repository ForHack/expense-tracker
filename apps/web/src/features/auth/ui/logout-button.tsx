'use client';

import { LogOutIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { ROUTES } from '@/shared/config';
import { Button } from '@/shared/ui/button';
import { logout } from '../api/auth-api';

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      await logout();
      router.replace(ROUTES.login);
      router.refresh();
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      title="Выйти"
      disabled={isPending}
      onClick={onClick}
    >
      <LogOutIcon className="size-5" />
      <span className="sr-only">Выйти</span>
    </Button>
  );
}
