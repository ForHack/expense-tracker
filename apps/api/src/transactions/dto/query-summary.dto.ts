import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

/**
 * Query-параметры `GET /api/transactions/summary`.
 * Оба параметра обязательны: без месяца и года агрегировать нечего.
 * Границы периода считаются в UTC.
 */
export class QuerySummaryDto {
  /** Номер месяца, 1–12. */
  @ApiProperty({ description: 'Номер месяца', minimum: 1, maximum: 12, example: 9 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  /** Год, 1970–2100. */
  @ApiProperty({ description: 'Год', minimum: 1970, maximum: 2100, example: 2026 })
  @Type(() => Number)
  @IsInt()
  @Min(1970)
  @Max(2100)
  year!: number;
}
