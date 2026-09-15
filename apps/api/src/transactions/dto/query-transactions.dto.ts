import { TransactionType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Query-параметры `GET /api/transactions`. Все поля необязательны:
 * незаданный фильтр просто не попадает в `where`.
 */
export class QueryTransactionsDto {
  /** Только операции по этому счёту. */
  @IsOptional()
  @IsString()
  accountId?: string;

  /** Только операции этой категории. */
  @IsOptional()
  @IsString()
  categoryId?: string;

  /** Только операции этого направления. */
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  /** Нижняя граница даты, включительно; ISO-строка. */
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  /** Верхняя граница даты, включительно; ISO-строка. */
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  /** Номер страницы с 1; по умолчанию 1. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  /** Размер страницы, 1–100; по умолчанию 20. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perPage?: number;
}
