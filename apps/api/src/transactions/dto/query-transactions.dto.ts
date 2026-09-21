import { ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Query-параметры `GET /api/transactions`. Все поля необязательны:
 * незаданный фильтр просто не попадает в `where`.
 */
export class QueryTransactionsDto {
  /** Только операции по этому счёту. */
  @ApiPropertyOptional({ description: 'Фильтр по счёту', example: 'clx1a2b3c0000v8qk7m9n4p2r' })
  @IsOptional()
  @IsString()
  accountId?: string;

  /** Только операции этой категории. */
  @ApiPropertyOptional({ description: 'Фильтр по категории', example: 'clx9z8y7w0000v8qk1a2b3c4d' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  /** Только операции этого направления. */
  @ApiPropertyOptional({ description: 'Фильтр по направлению', enum: TransactionType })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  /** Нижняя граница даты, включительно; ISO-строка. */
  @ApiPropertyOptional({
    description: 'Нижняя граница даты, включительно',
    format: 'date-time',
    example: '2026-09-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  /** Верхняя граница даты, включительно; ISO-строка. */
  @ApiPropertyOptional({
    description: 'Верхняя граница даты, включительно',
    format: 'date-time',
    example: '2026-09-30T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  /** Номер страницы с 1; по умолчанию 1. */
  @ApiPropertyOptional({ description: 'Номер страницы', minimum: 1, default: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  /** Размер страницы, 1–100; по умолчанию 20. */
  @ApiPropertyOptional({
    description: 'Размер страницы',
    minimum: 1,
    maximum: 100,
    default: 20,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perPage?: number;
}
