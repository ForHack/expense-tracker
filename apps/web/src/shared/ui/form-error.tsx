import { AlertCircleIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/shared/ui/alert';

/** Ошибка, не привязанная к полю: 401 от login, 409 от register, недоступный API. */
export function FormError({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
