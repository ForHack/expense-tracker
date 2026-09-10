import { NotFoundException } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Test } from '@nestjs/testing';
import { TransactionType } from '@prisma/client';
import { AssertAccountOwnedQuery } from '../accounts/cqrs';
import { AssertCategoryOwnedQuery } from '../categories/cqrs';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionsService } from './transactions.service';

describe('TransactionsService: проверка чужих связей', () => {
  let service: TransactionsService;
  let prisma: { transaction: { create: jest.Mock; findFirst: jest.Mock } };
  let queryBus: { execute: jest.Mock };

  const dto = {
    amount: '100.00',
    type: TransactionType.EXPENSE,
    date: '2026-09-10T00:00:00.000Z',
    accountId: 'acc-1',
  };

  beforeEach(async () => {
    prisma = { transaction: { create: jest.fn(), findFirst: jest.fn() } };
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

  it('findOne фильтрует по userId', async () => {
    prisma.transaction.findFirst.mockResolvedValue(null);

    await expect(service.findOne('tx-1', 'другой-user')).rejects.toThrow(NotFoundException);
    expect(prisma.transaction.findFirst).toHaveBeenCalledWith({
      where: { id: 'tx-1', userId: 'другой-user' },
      include: { account: true, category: true },
    });
  });
});
