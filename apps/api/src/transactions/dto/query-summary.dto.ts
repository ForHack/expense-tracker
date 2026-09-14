import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

/** Оба параметра обязательны: без месяца и года агрегировать нечего. */
export class QuerySummaryDto {
  /** Номер месяца, 1–12. */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1970)
  @Max(2100)
  year!: number;
}
