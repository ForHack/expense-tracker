import { AccountType } from '@prisma/client';
import { IsEnum, IsNumberString, IsOptional, IsString, Length } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  name!: string;

  @IsEnum(AccountType)
  type!: AccountType;

  /** Строка, чтобы не терять точность Decimal при передаче по HTTP. */
  @IsOptional()
  @IsNumberString()
  balance?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;
}
