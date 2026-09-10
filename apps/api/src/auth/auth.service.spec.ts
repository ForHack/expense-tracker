import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Prisma, User } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };

  const buildUser = async (): Promise<User> => ({
    id: 'user-1',
    email: 'a@b.c',
    passwordHash: await UsersService.hashPassword('password123'),
    name: 'Тест',
    currency: 'USD',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(async () => {
    commandBus = { execute: jest.fn() };
    queryBus = { execute: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: CommandBus, useValue: commandBus },
        { provide: QueryBus, useValue: queryBus },
        { provide: JwtService, useValue: { signAsync: jest.fn().mockResolvedValue('signed') } },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('login', () => {
    it('возвращает токен и пользователя без passwordHash', async () => {
      queryBus.execute.mockResolvedValue(await buildUser());

      const result = await service.login({ email: 'a@b.c', password: 'password123' });

      expect(result.accessToken).toBe('signed');
      expect(result.user).toMatchObject({ id: 'user-1', email: 'a@b.c' });
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('бросает 401 при неверном пароле', async () => {
      queryBus.execute.mockResolvedValue(await buildUser());

      await expect(service.login({ email: 'a@b.c', password: 'wrong' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('бросает 401 с тем же сообщением, если пользователя нет', async () => {
      queryBus.execute.mockResolvedValue(null);

      await expect(
        service.login({ email: 'нет@такого.c', password: 'password123' }),
      ).rejects.toThrow('Неверный email или пароль');
    });
  });

  describe('register', () => {
    it('создаёт пользователя и сразу выдаёт токен', async () => {
      const user = await buildUser();
      const safeUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        currency: user.currency,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
      commandBus.execute.mockResolvedValue(safeUser);

      const result = await service.register({ email: 'a@b.c', password: 'password123' });

      expect(commandBus.execute).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ accessToken: 'signed', user: safeUser });
    });

    it('переводит P2002 по email в ConflictException', async () => {
      commandBus.execute.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('дубликат', {
          code: 'P2002',
          clientVersion: '6.19.3',
          meta: { target: ['email'] },
        }),
      );

      await expect(service.register({ email: 'a@b.c', password: 'password123' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('пробрасывает прочие ошибки Prisma как есть', async () => {
      commandBus.execute.mockRejectedValue(new Error('соединение потеряно'));

      await expect(service.register({ email: 'a@b.c', password: 'password123' })).rejects.toThrow(
        'соединение потеряно',
      );
    });
  });
});
