import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType } from '@prisma/client';

/**
 * Транзакция в том виде, в каком она уходит клиенту.
 * Класс нужен только Swagger-у: типы Prisma не несут метаданных для схемы OpenAPI.
 */
export class TransactionResponseDto {
  @ApiProperty({ description: 'Идентификатор транзакции', example: 'clx1a2b3c0000v8qk7m9n4p2r' })
  id!: string;

  @ApiProperty({
    description: 'Сумма — всегда положительная; строка, чтобы не терять точность Decimal(14,2)',
    example: '1250.00',
  })
  amount!: string;

  @ApiProperty({ description: 'Направление операции', enum: TransactionType, example: 'EXPENSE' })
  type!: TransactionType;

  @ApiProperty({
    description: 'Дата операции, ISO 8601',
    format: 'date-time',
    example: '2026-09-14T10:30:00.000Z',
  })
  date!: string;

  @ApiPropertyOptional({
    description: 'Комментарий пользователя',
    nullable: true,
    example: 'Продукты на неделю',
  })
  note!: string | null;

  @ApiProperty({ description: 'Владелец записи; берётся из JWT, клиентом не задаётся' })
  userId!: string;

  @ApiProperty({ description: 'Счёт, по которому прошла операция' })
  accountId!: string;

  @ApiPropertyOptional({
    description: 'Категория; null — транзакция без категории',
    nullable: true,
  })
  categoryId!: string | null;

  @ApiProperty({ format: 'date-time', description: 'Когда запись создана' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time', description: 'Когда запись последний раз менялась' })
  updatedAt!: string;
}

/** Метаданные пагинации листинга транзакций. */
export class PaginationMetaDto {
  @ApiProperty({ description: 'Текущая страница, с 1', example: 1 })
  page!: number;

  @ApiProperty({ description: 'Размер страницы', example: 20 })
  perPage!: number;

  @ApiProperty({ description: 'Всего записей, подходящих под фильтры', example: 137 })
  total!: number;

  @ApiProperty({ description: 'Всего страниц при текущем perPage', example: 7 })
  totalPages!: number;
}

/** Ответ `GET /api/transactions` — единственный листинг API с пагинацией. */
export class PaginatedTransactionsDto {
  @ApiProperty({ type: [TransactionResponseDto], description: 'Записи текущей страницы' })
  data!: TransactionResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

/** Строка разбивки итогов по одной паре «категория + тип». */
export class SummaryCategoryTotalDto {
  @ApiPropertyOptional({
    description: 'Категория; null — сумма по транзакциям без категории',
    nullable: true,
  })
  categoryId!: string | null;

  @ApiPropertyOptional({
    description: 'Название категории; null, если категории нет',
    nullable: true,
    example: 'Продукты',
  })
  name!: string | null;

  @ApiProperty({ enum: TransactionType, description: 'Направление операций в этой строке' })
  type!: TransactionType;

  @ApiProperty({ description: 'Сумма по строке, две цифры после запятой', example: '4300.00' })
  total!: string;
}

/** Ответ `GET /api/transactions/summary`: итоги за календарный месяц (UTC). */
export class TransactionsSummaryDto {
  @ApiProperty({ description: 'Месяц, за который посчитаны итоги', example: 9 })
  month!: number;

  @ApiProperty({ description: 'Год, за который посчитаны итоги', example: 2026 })
  year!: number;

  @ApiProperty({ description: 'Сумма доходов за месяц', example: '90000.00' })
  income!: string;

  @ApiProperty({ description: 'Сумма расходов за месяц', example: '52310.40' })
  expense!: string;

  @ApiProperty({
    description: 'income − expense; переводы между своими счетами (TRANSFER) сюда не входят',
    example: '37689.60',
  })
  balance!: string;

  @ApiProperty({
    type: [SummaryCategoryTotalDto],
    description: 'Разбивка по категориям; строки с типом TRANSFER здесь присутствуют',
  })
  byCategory!: SummaryCategoryTotalDto[];
}
