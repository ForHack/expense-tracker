import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: {
    category: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      category: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [CategoriesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(CategoriesService);
  });

  describe('изоляция по пользователю', () => {
    it('findOne фильтрует по userId', async () => {
      prisma.category.findFirst.mockResolvedValue({ id: 'cat-1', userId: 'user-1' });

      await service.findOne('cat-1', 'user-1');

      expect(prisma.category.findFirst).toHaveBeenCalledWith({
        where: { id: 'cat-1', userId: 'user-1' },
        include: { children: true },
      });
    });

    it('чужая категория даёт 404, а не чужие данные', async () => {
      prisma.category.findFirst.mockResolvedValue(null);

      await expect(service.findOne('cat-1', 'другой-user')).rejects.toThrow(NotFoundException);
    });

    it('update не трогает БД, если категория чужая', async () => {
      prisma.category.findFirst.mockResolvedValue(null);

      await expect(
        service.update('cat-1', 'другой-user', { name: 'Переименована' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.category.update).not.toHaveBeenCalled();
    });

    it('remove не трогает БД, если категория чужая', async () => {
      prisma.category.findFirst.mockResolvedValue(null);

      await expect(service.remove('cat-1', 'другой-user')).rejects.toThrow(NotFoundException);
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });

    it('create подставляет userId из токена', async () => {
      prisma.category.create.mockResolvedValue({ id: 'cat-1' });

      await service.create('user-1', { name: 'Еда', type: TransactionType.EXPENSE });

      expect(prisma.category.create).toHaveBeenCalledWith({
        data: { name: 'Еда', type: TransactionType.EXPENSE, userId: 'user-1' },
      });
    });
  });

  describe('проверка parentId', () => {
    it('чужой родитель даёт 404 и категория не создаётся', async () => {
      prisma.category.findFirst.mockResolvedValue(null);

      await expect(
        service.create('user-1', {
          name: 'Кофе',
          type: TransactionType.EXPENSE,
          parentId: 'чужая-cat',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.category.create).not.toHaveBeenCalled();
    });

    it('категория не может быть родителем самой себе', async () => {
      prisma.category.findFirst.mockResolvedValue({
        id: 'cat-1',
        userId: 'user-1',
        parentId: null,
      });

      await expect(service.update('cat-1', 'user-1', { parentId: 'cat-1' })).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.category.update).not.toHaveBeenCalled();
    });

    it('родителем нельзя сделать собственного потомка', async () => {
      prisma.category.findFirst
        // findOne самой категории
        .mockResolvedValueOnce({ id: 'cat-1', userId: 'user-1', parentId: null })
        // findOne будущего родителя — он же ребёнок cat-1
        .mockResolvedValueOnce({ id: 'cat-2', userId: 'user-1', parentId: 'cat-1' });

      await expect(service.update('cat-1', 'user-1', { parentId: 'cat-2' })).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.category.update).not.toHaveBeenCalled();
    });

    it('корректный родитель из своего дерева проходит проверку', async () => {
      prisma.category.findFirst
        .mockResolvedValueOnce({ id: 'cat-1', userId: 'user-1', parentId: null })
        .mockResolvedValueOnce({ id: 'cat-2', userId: 'user-1', parentId: null });
      prisma.category.update.mockResolvedValue({ id: 'cat-1', parentId: 'cat-2' });

      await service.update('cat-1', 'user-1', { parentId: 'cat-2' });

      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: { parentId: 'cat-2' },
      });
    });
  });

  it('дубликат имени превращается в 409, а не в 500', async () => {
    prisma.category.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('дубликат', {
        code: 'P2002',
        clientVersion: '6.19.3',
        meta: { target: ['userId', 'name', 'type'] },
      }),
    );

    await expect(
      service.create('user-1', { name: 'Еда', type: TransactionType.EXPENSE }),
    ).rejects.toThrow(ConflictException);
  });

  it('findAll прокидывает фильтры в where', async () => {
    prisma.category.findMany.mockResolvedValue([]);

    await service.findAll('user-1', { type: TransactionType.EXPENSE });

    expect(prisma.category.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', type: TransactionType.EXPENSE, parentId: undefined },
      orderBy: { name: 'asc' },
    });
  });
});
