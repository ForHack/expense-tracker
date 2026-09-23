import Link from 'next/link';
import { RegisterForm } from '@/features/auth';
import { ROUTES } from '@/shared/config';

export function RegisterPage() {
  return (
    <div className="w-full max-w-md">
      <p className="eyebrow text-muted-foreground">Первый шаг</p>
      <h1 className="display-title mt-3 text-4xl sm:text-5xl">
        Новый <span className="display-mark">аккаунт</span>
      </h1>
      <p className="mt-4 text-sm text-muted-foreground">Вход выполнится автоматически.</p>

      <div className="shadow-soft mt-8 rounded-3xl bg-card p-7">
        <RegisterForm />
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Уже есть аккаунт?{' '}
        <Link href={ROUTES.login} className="font-semibold text-foreground hover:underline">
          Войти
        </Link>
      </p>
    </div>
  );
}
