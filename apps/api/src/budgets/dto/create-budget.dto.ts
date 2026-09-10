import { BudgetPeriod } from '@prisma/client';
import { IsDateString, IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';

export class CreateBudgetDto {
  @IsNumberString()
  amount!: string;

  @IsEnum(BudgetPeriod)
  period!: BudgetPeriod;

  @IsDateString()
  startDate!: string;

  /** Не задан — бюджет бессрочный. */
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsString()
  categoryId!: string;
}
