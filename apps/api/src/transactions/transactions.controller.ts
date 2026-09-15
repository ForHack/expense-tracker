import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Transaction } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { QuerySummaryDto } from './dto/query-summary.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import {
  PaginatedTransactions,
  TransactionsService,
  TransactionsSummary,
} from './transactions.service';

/**
 * HTTP-слой транзакций: `/api/transactions`.
 * Все маршруты закрыты глобальным `JwtAuthGuard`, `userId` берётся из токена,
 * а не из тела или query, — сам контроллер только делегирует в сервис.
 */
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  /**
   * `POST /api/transactions` — создаёт транзакцию текущего пользователя.
   *
   * @param userId Идентификатор пользователя из JWT.
   * @param dto Тело запроса; лишние поля дают 400 из-за `forbidNonWhitelisted`.
   * @returns Созданную транзакцию.
   * @throws {BadRequestException} Тело не прошло валидацию `CreateTransactionDto`.
   * @throws {NotFoundException} Указанный счёт или категория чужие либо не существуют.
   */
  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTransactionDto,
  ): Promise<Transaction> {
    return this.transactionsService.create(userId, dto);
  }

  /**
   * `GET /api/transactions` — страница транзакций пользователя с фильтрами.
   *
   * @param userId Идентификатор пользователя из JWT.
   * @param query Фильтры и пагинация; числовые поля приводятся `ValidationPipe`.
   * @returns `{ data, meta }` — единственный листинг API с пагинацией.
   * @throws {BadRequestException} Query-параметры не прошли валидацию `QueryTransactionsDto`.
   */
  @Get()
  findAll(
    @CurrentUser('id') userId: string,
    @Query() query: QueryTransactionsDto,
  ): Promise<PaginatedTransactions> {
    return this.transactionsService.findAll(userId, query);
  }

  /**
   * `GET /api/transactions/summary` — итоги за месяц и разбивка по категориям.
   * Объявлен выше `@Get(':id')`: иначе Nest сматчит «summary» как id и вернёт 404.
   *
   * @param userId Идентификатор пользователя из JWT.
   * @param query Обязательные `month` (1–12) и `year`.
   * @returns Доходы, расходы, баланс за месяц и суммы по категориям.
   * @throws {BadRequestException} `month`/`year` отсутствуют или вне допустимого диапазона.
   */
  @Get('summary')
  summary(
    @CurrentUser('id') userId: string,
    @Query() query: QuerySummaryDto,
  ): Promise<TransactionsSummary> {
    return this.transactionsService.summary(userId, query);
  }

  /**
   * `GET /api/transactions/:id` — одна транзакция со счётом и категорией.
   *
   * @param userId Идентификатор пользователя из JWT.
   * @param id Идентификатор транзакции из пути.
   * @returns Транзакцию с включёнными связями.
   * @throws {NotFoundException} Транзакции нет или она принадлежит другому пользователю.
   */
  @Get(':id')
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string): Promise<Transaction> {
    return this.transactionsService.findOne(id, userId);
  }

  /**
   * `PATCH /api/transactions/:id` — частичное обновление транзакции.
   *
   * @param userId Идентификатор пользователя из JWT.
   * @param id Идентификатор транзакции из пути.
   * @param dto Изменяемые поля; все опциональны.
   * @returns Обновлённую транзакцию.
   * @throws {BadRequestException} Тело не прошло валидацию `UpdateTransactionDto`.
   * @throws {NotFoundException} Транзакции нет либо новый счёт/категория чужие или не существуют.
   */
  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
  ): Promise<Transaction> {
    return this.transactionsService.update(id, userId, dto);
  }

  /**
   * `DELETE /api/transactions/:id` — удаляет транзакцию.
   *
   * @param userId Идентификатор пользователя из JWT.
   * @param id Идентификатор транзакции из пути.
   * @returns Удалённую запись (тело ответа, а не 204).
   * @throws {NotFoundException} Транзакции нет или она принадлежит другому пользователю.
   */
  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string): Promise<Transaction> {
    return this.transactionsService.remove(id, userId);
  }
}
