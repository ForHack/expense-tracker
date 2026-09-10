import { TransactionType } from '@prisma/client';
import { IsDateString, IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';

export class CreateTransactionDto {
  /** Строка, чтобы не терять точность Decimal при передаче по HTTP. */
  @IsNumberString()
  amount!: string;

  @IsEnum(TransactionType)
  type!: TransactionType;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsString()
  accountId!: string;

  @IsOptional()
  @IsString()
  categoryId?: string;
}
