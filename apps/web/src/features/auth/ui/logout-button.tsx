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
      size="sm"
      className="w-full justify-start"
      disabled={isPending}
      onClick={onClick}
    >
      <LogOutIcon />
      Выйти
    </Button>
  );
}
