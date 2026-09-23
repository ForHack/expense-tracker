import Link from 'next/link';
import { LoginForm } from '@/features/auth';
import { ROUTES } from '@/shared/config';

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
    <div className="w-full max-w-md">
      <p className="eyebrow text-muted-foreground">Рады видеть снова</p>
      <h1 className="display-title mt-3 text-4xl sm:text-5xl">
        Вход в <span className="display-mark">учёт</span>
      </h1>

      <div className="shadow-soft mt-8 rounded-3xl bg-card p-7">
        <LoginForm redirectTo={redirectTo} />
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Нет аккаунта?{' '}
        <Link href={ROUTES.register} className="font-semibold text-foreground hover:underline">
          Зарегистрироваться
        </Link>
      </p>
    </div>
  );
}
