import { z } from 'zod';

/**
 * Схемы повторяют class-validator на бэкенде (apps/api/src/users/dto/create-user.dto.ts):
 * email, пароль от 8 символов, name и currency опциональны (currency — ровно 3 символа).
 * Используются и в формах (inline-ошибки), и в Route Handlers (отсечь мусор до вызова Nest).
 */

const PASSWORD_MIN_LENGTH = 8;

const emailSchema = z.email({ message: 'Укажите корректный email' });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Введите пароль'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

/** Тело, которое уходит в Nest: то же, что RegisterDto. */
export const registerPayloadSchema = z.object({
  email: emailSchema,
  password: z.string().min(PASSWORD_MIN_LENGTH, `Минимум ${PASSWORD_MIN_LENGTH} символов`),
  name: z.string().trim().min(1).max(100).optional(),
  currency: z.string().trim().length(3, 'Код валюты — ровно 3 буквы').optional(),
});

export type RegisterPayload = z.infer<typeof registerPayloadSchema>;

/**
 * Схема формы: плюс подтверждение пароля и согласие с условиями — обоих в API нет,
 * и без `currency`: валюту при регистрации не спрашиваем, Prisma подставляет `@default("USD")`.
 */
export const registerFormSchema = registerPayloadSchema
  .omit({ currency: true })
  .extend({
    name: z.string().trim().max(100, 'Не больше 100 символов'),
    passwordConfirm: z.string().min(1, 'Повторите пароль'),
    // boolean + refine, а не literal(true): иначе в defaultValues нельзя положить `false`
    acceptTerms: z
      .boolean()
      .refine((checked) => checked, 'Примите соглашение и политику обработки данных'),
  })
  .refine((values) => values.password === values.passwordConfirm, {
    path: ['passwordConfirm'],
    message: 'Пароли не совпадают',
  });

export type RegisterFormValues = z.infer<typeof registerFormSchema>;

/** Форма → тело запроса: пустое имя не отправляем. */
export function toRegisterPayload({ email, password, name }: RegisterFormValues): RegisterPayload {
  return {
    email,
    password,
    ...(name ? { name } : {}),
  };
}
