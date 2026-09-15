import { TransactionType } from '@prisma/client';
import { IsDateString, IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';

/**
 * Тело `POST /api/transactions`. Поля `userId` здесь нет намеренно: владелец берётся
 * из токена, а присланный в теле `userId` даст 400 из-за `forbidNonWhitelisted`.
 */
export class CreateTransactionDto {
  /**
   * Сумма — всегда положительная, направление задаёт {@link type}.
   * Строка, чтобы не терять точность Decimal при передаче по HTTP.
   */
  @IsNumberString()
  amount!: string;

  /** Направление операции: `INCOME`, `EXPENSE` или `TRANSFER`. */
  @IsEnum(TransactionType)
  type!: TransactionType;

  /** Дата операции ISO-строкой; сервис конвертирует её в `Date`. */
  @IsDateString()
  date!: string;

  /** Произвольный комментарий пользователя. */
  @IsOptional()
  @IsString()
  note?: string;

  /** Счёт, по которому проходит операция; должен принадлежать тому же пользователю. */
  @IsString()
  accountId!: string;

  /** Категория; необязательна — транзакция может остаться без неё. */
  @IsOptional()
  @IsString()
  categoryId?: string;
}
