import { NotFoundException } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Test } from '@nestjs/testing';
import { Prisma, TransactionType } from '@prisma/client';
import { AssertAccountOwnedQuery } from '../accounts/cqrs';
import { AssertCategoryOwnedQuery } from '../categories/cqrs';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionsService } from './transactions.service';

describe('TransactionsService: проверка чужих связей', () => {
  let service: TransactionsService;
  let prisma: {
    transaction: { create: jest.Mock; findFirst: jest.Mock; findMany: jest.Mock; count: jest.Mock };
    $transaction: jest.Mock;
  };
  let queryBus: { execute: jest.Mock };

  const dto = {
    amount: '100.00',
    type: TransactionType.EXPENSE,
    date: '2026-09-10T00:00:00.000Z',
    accountId: 'acc-1',
  };

  beforeEach(async () => {
    prisma = {
      transaction: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      // Реальный $transaction принимает массив операций и резолвит их вместе.
      $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
    };
    queryBus = { execute: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: QueryBus, useValue: queryBus },
      ],
    }).compile();

    service = moduleRef.get(TransactionsService);
  });

  it('create проверяет счёт через QueryBus и подставляет userId', async () => {
    prisma.transaction.create.mockResolvedValue({ id: 'tx-1' });

    await service.create('user-1', dto);

    expect(queryBus.execute).toHaveBeenCalledWith(new AssertAccountOwnedQuery('acc-1', 'user-1'));
    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: {
        amount: '100.00',
        type: TransactionType.EXPENSE,
        accountId: 'acc-1',
        userId: 'user-1',
        date: new Date(dto.date),
      },
    });
  });

  it('create с чужим accountId не доходит до записи в БД', async () => {
    queryBus.execute.mockRejectedValue(new NotFoundException('Счёт acc-1 не найден'));

    await expect(service.create('user-1', dto)).rejects.toThrow(NotFoundException);
    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });

  it('create проверяет и категорию, если она передана', async () => {
    prisma.transaction.create.mockResolvedValue({ id: 'tx-1' });

    await service.create('user-1', { ...dto, categoryId: 'cat-1' });

    expect(queryBus.execute).toHaveBeenCalledWith(new AssertCategoryOwnedQuery('cat-1', 'user-1'));
  });

  it('findAll переводит dateFrom/dateTo в диапазон по date', async () => {
    prisma.transaction.findMany.mockResolvedValue([]);
    prisma.transaction.count.mockResolvedValue(0);

    await service.findAll('user-1', { dateFrom: '2026-09-01', dateTo: '2026-09-30' });

    expect(prisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          date: { gte: new Date('2026-09-01'), lte: new Date('2026-09-30') },
        }),
      }),
    );
  });

  it('findOne фильтрует по userId', async () => {
    prisma.transaction.findFirst.mockResolvedValue(null);

    await expect(service.findOne('tx-1', 'другой-user')).rejects.toThrow(NotFoundException);
    expect(prisma.transaction.findFirst).toHaveBeenCalledWith({
      where: { id: 'tx-1', userId: 'другой-user' },
      include: { account: true, category: true },
    });
  });
});

describe('TransactionsService.summary', () => {
  let service: TransactionsService;
  let prisma: {
    transaction: { groupBy: jest.Mock };
    category: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };

  const decimal = (value: string) => new Prisma.Decimal(value);

  beforeEach(async () => {
    prisma = {
      transaction: { groupBy: jest.fn() },
      category: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: QueryBus, useValue: { execute: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(TransactionsService);
  });

  it('ограничивает выборку пользователем и полуинтервалом месяца', async () => {
    prisma.transaction.groupBy.mockResolvedValue([]);

    await service.summary('user-1', { month: 9, year: 2026 });

    const expectedWhere = {
      userId: 'user-1',
      date: { gte: new Date('2026-09-01T00:00:00.000Z'), lt: new Date('2026-10-01T00:00:00.000Z') },
    };
    expect(prisma.transaction.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ by: ['type'], where: expectedWhere, _sum: { amount: true } }),
    );
    expect(prisma.transaction.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ['categoryId', 'type'],
        where: expectedWhere,
        _sum: { amount: true },
      }),
    );
  });

  it('за пустой месяц отдаёт нули, а не null', async () => {
    prisma.transaction.groupBy.mockResolvedValue([]);

    await expect(service.summary('user-1', { month: 1, year: 2026 })).resolves.toEqual({
      month: 1,
      year: 2026,
      income: '0.00',
      expense: '0.00',
      balance: '0.00',
      byCategory: [],
    });
    expect(prisma.category.findMany).not.toHaveBeenCalled();
  });

  it('считает balance как income − expense и не учитывает TRANSFER', async () => {
    prisma.transaction.groupBy
      .mockResolvedValueOnce([
        { type: TransactionType.INCOME, _sum: { amount: decimal('5000') } },
        { type: TransactionType.EXPENSE, _sum: { amount: decimal('1840.50') } },
        { type: TransactionType.TRANSFER, _sum: { amount: decimal('900') } },
      ])
      .mockResolvedValueOnce([]);

    const result = await service.summary('user-1', { month: 9, year: 2026 });

    expect(result).toMatchObject({ income: '5000.00', expense: '1840.50', balance: '3159.50' });
  });

  it('подставляет имена категорий одним запросом и null для транзакций без категории', async () => {
    prisma.transaction.groupBy.mockResolvedValueOnce([]).mockResolvedValueOnce([
      { categoryId: 'cat-1', type: TransactionType.EXPENSE, _sum: { amount: decimal('840.50') } },
      { categoryId: null, type: TransactionType.EXPENSE, _sum: { amount: decimal('1000') } },
    ]);
    prisma.category.findMany.mockResolvedValue([{ id: 'cat-1', name: 'Еда' }]);

    const { byCategory } = await service.summary('user-1', { month: 9, year: 2026 });

    expect(prisma.category.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.category.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['cat-1'] }, userId: 'user-1' },
      select: { id: true, name: true },
    });
    expect(byCategory).toEqual([
      { categoryId: 'cat-1', name: 'Еда', type: TransactionType.EXPENSE, total: '840.50' },
      { categoryId: null, name: null, type: TransactionType.EXPENSE, total: '1000.00' },
    ]);
  });
});
