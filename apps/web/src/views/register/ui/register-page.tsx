import Link from 'next/link';
import { RegisterForm } from '@/features/auth';
import { ROUTES } from '@/shared/config';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';

export function RegisterPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Регистрация</CardTitle>
        <CardDescription>Создайте аккаунт — вход выполнится автоматически.</CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        Уже есть аккаунт?&nbsp;
        <Link href={ROUTES.login} className="font-medium text-foreground hover:underline">
          Войти
        </Link>
      </CardFooter>
    </Card>
  );
}
