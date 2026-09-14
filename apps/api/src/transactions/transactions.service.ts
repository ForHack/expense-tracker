import { Injectable, NotFoundException } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Prisma, Transaction, TransactionType } from '@prisma/client';
import { AssertAccountOwnedQuery } from '../accounts/cqrs';
import { AssertCategoryOwnedQuery } from '../categories/cqrs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { QuerySummaryDto } from './dto/query-summary.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

export interface PaginatedTransactions {
  data: Transaction[];
  meta: { page: number; perPage: number; total: number; totalPages: number };
}

/** Сумма по одной категории за месяц; `categoryId: null` — транзакции без категории. */
export interface SummaryCategoryTotal {
  categoryId: string | null;
  name: string | null;
  type: TransactionType;
  total: string;
}

export interface TransactionsSummary {
  month: number;
  year: number;
  income: string;
  expense: string;
  balance: string;
  byCategory: SummaryCategoryTotal[];
}

const DEFAULT_PER_PAGE = 20;

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBus: QueryBus,
  ) {}

  async create(userId: string, dto: CreateTransactionDto): Promise<Transaction> {
    const { date, ...rest } = dto;
    await this.assertRelationsOwned(userId, dto.accountId, dto.categoryId);
    return this.prisma.transaction.create({ data: { ...rest, userId, date: new Date(date) } });
  }

  async findAll(userId: string, query: QueryTransactionsDto): Promise<PaginatedTransactions> {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? DEFAULT_PER_PAGE;

    const where: Prisma.TransactionWhereInput = {
      userId,
      accountId: query.accountId,
      categoryId: query.categoryId,
      type: query.type,
      date:
        query.dateFrom || query.dateTo
          ? {
              gte: query.dateFrom ? new Date(query.dateFrom) : undefined,
              lte: query.dateTo ? new Date(query.dateTo) : undefined,
            }
          : undefined,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        include: { account: true, category: true },
        orderBy: { date: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data,
      meta: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
    };
  }

  /**
   * Итоги за календарный месяц (UTC) плюс разбивка по категориям.
   * `TRANSFER` — перемещение между своими счетами, поэтому в income/expense/balance
   * он не входит, но в `byCategory` строки с таким типом появляются.
   */
  async summary(userId: string, { month, year }: QuerySummaryDto): Promise<TransactionsSummary> {
    const where: Prisma.TransactionWhereInput = {
      userId,
      // Полуинтервал [первое число месяца, первое число следующего) — не теряет
      // пограничные миллисекунды последнего дня.
      date: { gte: new Date(Date.UTC(year, month - 1, 1)), lt: new Date(Date.UTC(year, month, 1)) },
    };

    const [byType, byCategoryRaw] = await this.prisma.$transaction([
      // orderBy у groupBy обязателен по типам Prisma, даже когда порядок не важен.
      this.prisma.transaction.groupBy({
        by: ['type'],
        where,
        _sum: { amount: true },
        orderBy: { type: 'asc' },
      }),
      this.prisma.transaction.groupBy({
        by: ['categoryId', 'type'],
        where,
        _sum: { amount: true },
        orderBy: [{ categoryId: 'asc' }, { type: 'asc' }],
      }),
    ]);

    const totalOf = (type: TransactionType): Prisma.Decimal =>
      byType.find((row) => row.type === type)?._sum?.amount ?? new Prisma.Decimal(0);

    const income = totalOf(TransactionType.INCOME);
    const expense = totalOf(TransactionType.EXPENSE);

    // Имена категорий берём одним запросом, чтобы не плодить N+1 внутри map.
    const categoryIds = byCategoryRaw
      .map((row) => row.categoryId)
      .filter((id): id is string => id !== null);
    const categories = categoryIds.length
      ? await this.prisma.category.findMany({
          where: { id: { in: categoryIds }, userId },
          select: { id: true, name: true },
        })
      : [];
    const namesById = new Map(categories.map((category) => [category.id, category.name]));

    return {
      month,
      year,
      income: income.toFixed(2),
      expense: expense.toFixed(2),
      balance: income.minus(expense).toFixed(2),
      byCategory: byCategoryRaw.map((row) => ({
        categoryId: row.categoryId,
        name: row.categoryId ? (namesById.get(row.categoryId) ?? null) : null,
        type: row.type,
        total: (row._sum?.amount ?? new Prisma.Decimal(0)).toFixed(2),
      })),
    };
  }

  /** Ищет только среди транзакций пользователя: чужой id неотличим от несуществующего. */
  async findOne(id: string, userId: string): Promise<Transaction> {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, userId },
      include: { account: true, category: true },
    });
    if (!transaction) {
      throw new NotFoundException(`Транзакция ${id} не найдена`);
    }
    return transaction;
  }

  async update(id: string, userId: string, dto: UpdateTransactionDto): Promise<Transaction> {
    await this.findOne(id, userId);
    await this.assertRelationsOwned(userId, dto.accountId, dto.categoryId);
    const { date, ...rest } = dto;
    return this.prisma.transaction.update({
      where: { id },
      data: { ...rest, ...(date ? { date: new Date(date) } : {}) },
    });
  }

  async remove(id: string, userId: string): Promise<Transaction> {
    await this.findOne(id, userId);
    return this.prisma.transaction.delete({ where: { id } });
  }

  /**
   * Счёт и категория принадлежат другим модулям, поэтому проверка идёт через QueryBus,
   * а не прямым обращением к их таблицам.
   */
  private async assertRelationsOwned(
    userId: string,
    accountId?: string,
    categoryId?: string,
  ): Promise<void> {
    if (accountId) {
      await this.queryBus.execute(new AssertAccountOwnedQuery(accountId, userId));
    }
    if (categoryId) {
      await this.queryBus.execute(new AssertCategoryOwnedQuery(categoryId, userId));
    }
  }
}
