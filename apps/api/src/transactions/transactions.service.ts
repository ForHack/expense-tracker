import { Injectable, NotFoundException } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Prisma, Transaction } from '@prisma/client';
import { AssertAccountOwnedQuery } from '../accounts/cqrs';
import { AssertCategoryOwnedQuery } from '../categories/cqrs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

export interface PaginatedTransactions {
  data: Transaction[];
  meta: { page: number; perPage: number; total: number; totalPages: number };
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
        query.from || query.to
          ? {
              gte: query.from ? new Date(query.from) : undefined,
              lte: query.to ? new Date(query.to) : undefined,
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
