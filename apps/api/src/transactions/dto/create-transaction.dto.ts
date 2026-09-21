import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({
    description: 'Сумма операции, всегда положительная; передаётся строкой',
    example: '1250.00',
  })
  @IsNumberString()
  amount!: string;

  /** Направление операции: `INCOME`, `EXPENSE` или `TRANSFER`. */
  @ApiProperty({
    description: 'Направление операции',
    enum: TransactionType,
    example: TransactionType.EXPENSE,
  })
  @IsEnum(TransactionType)
  type!: TransactionType;

  /** Дата операции ISO-строкой; сервис конвертирует её в `Date`. */
  @ApiProperty({
    description: 'Дата операции в формате ISO 8601',
    format: 'date-time',
    example: '2026-09-14T10:30:00.000Z',
  })
  @IsDateString()
  date!: string;

  /** Произвольный комментарий пользователя. */
  @ApiPropertyOptional({ description: 'Комментарий к операции', example: 'Продукты на неделю' })
  @IsOptional()
  @IsString()
  note?: string;

  /** Счёт, по которому проходит операция; должен принадлежать тому же пользователю. */
  @ApiProperty({
    description: 'Счёт операции; чужой или несуществующий даёт 404',
    example: 'clx1a2b3c0000v8qk7m9n4p2r',
  })
  @IsString()
  accountId!: string;

  /** Категория; необязательна — транзакция может остаться без неё. */
  @ApiPropertyOptional({
    description: 'Категория операции; чужая или несуществующая даёт 404',
    example: 'clx9z8y7w0000v8qk1a2b3c4d',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;
}
