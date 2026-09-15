import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

/**
 * Query-параметры `GET /api/transactions/summary`.
 * Оба параметра обязательны: без месяца и года агрегировать нечего.
 * Границы периода считаются в UTC.
 */
export class QuerySummaryDto {
  /** Номер месяца, 1–12. */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  /** Год, 1970–2100. */
  @Type(() => Number)
  @IsInt()
  @Min(1970)
  @Max(2100)
  year!: number;
}
