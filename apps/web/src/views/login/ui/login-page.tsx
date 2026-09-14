import Link from 'next/link';
import { LoginForm } from '@/features/auth';
import { ROUTES } from '@/shared/config';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';

/**
 * `from` ставит middleware, когда перехватывает заход на защищённую страницу без сессии.
 * Читаем его на сервере и передаём пропом — так клиентской форме не нужен useSearchParams
 * и оборачивающий Suspense.
 */
export async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ from?: string | string[] }>;
}) {
  const { from } = (await searchParams) ?? {};
  // Только относительный путь: `//evil.com` тоже начинается со слеша и увёл бы на другой домен
  const isSafePath = typeof from === 'string' && from.startsWith('/') && !from.startsWith('//');
  const redirectTo = isSafePath ? from : ROUTES.dashboard;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Вход</CardTitle>
        <CardDescription>Войдите, чтобы продолжить учёт расходов.</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm redirectTo={redirectTo} />
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        Нет аккаунта?&nbsp;
        <Link href={ROUTES.register} className="font-medium text-foreground hover:underline">
          Зарегистрироваться
        </Link>
      </CardFooter>
    </Card>
  );
}
