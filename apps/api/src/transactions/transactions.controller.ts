import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Transaction } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ErrorResponseDto } from './dto/error-response.dto';
import { QuerySummaryDto } from './dto/query-summary.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import {
  PaginatedTransactionsDto,
  TransactionResponseDto,
  TransactionsSummaryDto,
} from './dto/transaction-response.dto';
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
@ApiTags('transactions')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Токен не передан, просрочен или невалиден',
  type: ErrorResponseDto,
})
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
  @ApiOperation({
    summary: 'Создать транзакцию',
    description:
      'Создаёт операцию текущего пользователя. Владелец берётся из токена: поле `userId` ' +
      'в теле запрещено и даёт 400. Счёт и категория обязаны принадлежать тому же пользователю.',
  })
  @ApiCreatedResponse({ description: 'Транзакция создана', type: TransactionResponseDto })
  @ApiBadRequestResponse({
    description: 'Тело не прошло валидацию либо содержит лишние поля',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Счёт или категория не существуют либо принадлежат другому пользователю',
    type: ErrorResponseDto,
  })
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
  @ApiOperation({
    summary: 'Список транзакций',
    description:
      'Отдаёт страницу операций пользователя, отсортированных по дате по убыванию, ' +
      'вместе со связанными счётом и категорией. Незаданные фильтры игнорируются. ' +
      'Это единственный листинг API с пагинацией.',
  })
  @ApiOkResponse({ description: 'Страница транзакций', type: PaginatedTransactionsDto })
  @ApiBadRequestResponse({
    description: 'Query-параметры не прошли валидацию',
    type: ErrorResponseDto,
  })
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
  @ApiOperation({
    summary: 'Итоги за месяц',
    description:
      'Доходы, расходы и баланс за календарный месяц (границы считаются в UTC) плюс разбивка ' +
      'по категориям. `TRANSFER` — перемещение между своими счетами, поэтому в income/expense/' +
      'balance он не входит, но в `byCategory` строки с таким типом присутствуют. ' +
      'Месяц без операций даёт нули и пустой `byCategory`, а не 404.',
  })
  @ApiOkResponse({ description: 'Итоги за запрошенный месяц', type: TransactionsSummaryDto })
  @ApiBadRequestResponse({
    description: '`month`/`year` не переданы или вне диапазонов 1–12 и 1970–2100',
    type: ErrorResponseDto,
  })
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
  @ApiOperation({
    summary: 'Получить транзакцию',
    description:
      'Возвращает операцию вместе со счётом и категорией. Чужая транзакция неотличима от ' +
      'несуществующей: в обоих случаях 404, чтобы не подтверждать её существование.',
  })
  @ApiParam({ name: 'id', description: 'Идентификатор транзакции', example: 'clx1a2b3c0000v8qk' })
  @ApiOkResponse({ description: 'Найденная транзакция', type: TransactionResponseDto })
  @ApiNotFoundResponse({
    description: 'Транзакции нет или она принадлежит другому пользователю',
    type: ErrorResponseDto,
  })
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
  @ApiOperation({
    summary: 'Обновить транзакцию',
    description:
      'Частичное обновление: непереданные поля остаются прежними. Новые `accountId` и ' +
      '`categoryId` проверяются на принадлежность пользователю так же, как при создании.',
  })
  @ApiParam({ name: 'id', description: 'Идентификатор транзакции', example: 'clx1a2b3c0000v8qk' })
  @ApiOkResponse({ description: 'Обновлённая транзакция', type: TransactionResponseDto })
  @ApiBadRequestResponse({
    description: 'Тело не прошло валидацию либо содержит лишние поля',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Транзакции нет либо новый счёт или категория чужие или не существуют',
    type: ErrorResponseDto,
  })
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
  @ApiOperation({
    summary: 'Удалить транзакцию',
    description:
      'Удаляет операцию пользователя и возвращает её тело — ответ 200, а не 204. ' +
      'Балансы счетов при этом не пересчитываются.',
  })
  @ApiParam({ name: 'id', description: 'Идентификатор транзакции', example: 'clx1a2b3c0000v8qk' })
  @ApiOkResponse({ description: 'Удалённая транзакция', type: TransactionResponseDto })
  @ApiNotFoundResponse({
    description: 'Транзакции нет или она принадлежит другому пользователю',
    type: ErrorResponseDto,
  })
  remove(@CurrentUser('id') userId: string, @Param('id') id: string): Promise<Transaction> {
    return this.transactionsService.remove(id, userId);
  }
}
