import { TransactionType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class QueryCategoriesDto {
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @IsOptional()
  @IsString()
  parentId?: string;
}
