import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AccountType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from './accounts.service';

describe('AccountsService: изоляция по пользователю', () => {
  let service: AccountsService;
  let prisma: { account: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      account: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [AccountsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(AccountsService);
  });

  it('findOne фильтрует по userId', async () => {
    prisma.account.findFirst.mockResolvedValue({ id: 'acc-1', userId: 'user-1' });

    await service.findOne('acc-1', 'user-1');

    expect(prisma.account.findFirst).toHaveBeenCalledWith({
      where: { id: 'acc-1', userId: 'user-1' },
    });
  });

  it('чужой счёт даёт 404, а не чужие данные', async () => {
    prisma.account.findFirst.mockResolvedValue(null);

    await expect(service.findOne('acc-1', 'другой-user')).rejects.toThrow(NotFoundException);
  });

  it('update не трогает БД, если счёт чужой', async () => {
    prisma.account.findFirst.mockResolvedValue(null);

    await expect(
      service.update('acc-1', 'другой-user', { name: 'Переименован' }),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.account.update).not.toHaveBeenCalled();
  });

  it('create подставляет userId из токена', async () => {
    prisma.account.create.mockResolvedValue({ id: 'acc-1' });

    await service.create('user-1', { name: 'Кошелёк', type: AccountType.CASH });

    expect(prisma.account.create).toHaveBeenCalledWith({
      data: { name: 'Кошелёк', type: AccountType.CASH, userId: 'user-1' },
    });
  });
});
