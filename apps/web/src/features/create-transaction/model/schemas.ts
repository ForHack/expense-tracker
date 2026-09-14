import { TransactionType } from '@expense-tracker/shared-types';
import { z } from 'zod';

/**
 * Зеркало CreateTransactionDto (apps/api/src/transactions/dto/create-transaction.dto.ts):
 * сумма — строка (`@IsNumberString`, Decimal(14,2)), дата — ISO, accountId обязателен.
 * При изменении DTO править и эту схему.
 */

/** Не больше двух знаков после точки: в БД Decimal(14, 2), остальное молча округлится. */
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

export const createTransactionSchema = z.object({
  amount: z
    .string()
    .trim()
    .regex(AMOUNT_PATTERN, 'Сумма — положительное число, до двух знаков после точки')
    .refine((value) => Number(value) > 0, 'Сумма должна быть больше нуля'),
  type: z.enum(TransactionType),
  /** `<input type="date">` даёт `2026-09-14`; в ISO переводим перед отправкой. */
  date: z
    .string()
    .min(1, 'Укажите дату')
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Некорректная дата'),
  note: z.string().trim().max(500, 'Не больше 500 символов').optional(),
  accountId: z.string().min(1, 'Выберите счёт'),
  categoryId: z.string().optional(),
});

export type CreateTransactionFormValues = z.infer<typeof createTransactionSchema>;

/**
 * Форма → тело запроса: дата приводится к ISO (`@IsDateString` на бэке),
 * пустые необязательные поля не отправляем — пустой `categoryId` дал бы 400.
 */
export function toCreateTransactionPayload({
  amount,
  type,
  date,
  note,
  accountId,
  categoryId,
}: CreateTransactionFormValues) {
  return {
    amount,
    type,
    date: new Date(date).toISOString(),
    accountId,
    ...(note ? { note } : {}),
    ...(categoryId ? { categoryId } : {}),
  };
}
