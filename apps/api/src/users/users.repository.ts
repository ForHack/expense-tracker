import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Пользователь без хеша пароля — то, что уходит наружу. */
export type SafeUser = Omit<User, 'passwordHash'>;

/**
 * Белый список полей, которые разрешено отдавать наружу: перечисление, а не `omit`,
 * поэтому новое поле модели не утечёт в ответ само по себе. Должен оставаться
 * согласованным с {@link SafeUser} — рассинхрон ловится `satisfies Prisma.UserSelect`
 * только по именам полей, но не по их составу.
 */
const safeUserSelect = {
  id: true,
  email: true,
  name: true,
  currency: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

/**
 * Единственное место, где вызывается `prisma.user`.
 *
 * Слой намеренно «тонкий»: он не валидирует ввод и не бросает HTTP-исключений —
 * отсутствие записи выражается через `null`, а 404 добавляет {@link UsersService.findOne}.
 * Все методы, кроме {@link UsersRepository.findByEmailWithHash}, возвращают {@link SafeUser},
 * то есть `passwordHash` не покидает репозиторий.
 *
 * Провайдер объявлен в `UsersModule` и из него не экспортируется, поэтому за пределами
 * модуля `users` доступен только через CQRS-сообщения из `users/cqrs`.
 */
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Создаёт пользователя и сразу отдаёт его без хеша пароля.
   *
   * @param data Поля модели вместе с готовым `passwordHash` — хеширование выполняет
   *   `UsersService.hashPassword` до вызова, репозиторий принимает пароль уже обработанным.
   * @returns Созданного пользователя без `passwordHash`.
   * @throws {Prisma.PrismaClientKnownRequestError} Код `P2002` при занятом email;
   *   в 409 его переводит `AuthService.register`, здесь ошибка проходит как есть.
   */
  createSafe(data: Prisma.UserCreateInput): Promise<SafeUser> {
    return this.prisma.user.create({ data, select: safeUserSelect });
  }

  /**
   * Отдаёт всех пользователей, новых первыми.
   *
   * Фильтра по владельцу здесь нет и быть не может — это единственный метод репозитория
   * без изоляции по пользователю. HTTP-маршрута на него не заведено: `UsersController`
   * умеет только операции над собой. Прежде чем выставлять наружу, нужна проверка прав.
   *
   * @returns Массив пользователей без `passwordHash`; пустая база — это `[]`, а не `null`.
   */
  findMany(): Promise<SafeUser[]> {
    return this.prisma.user.findMany({
      select: safeUserSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Ищет пользователя по первичному ключу.
   *
   * @param id Идентификатор пользователя.
   * @returns Пользователя без `passwordHash` либо `null`, если записи нет.
   * @throws Ничего не бросает: превращать `null` в `NotFoundException` — задача
   *   `UsersService.findOne`, единственного источника 404 в модуле.
   */
  findById(id: string): Promise<SafeUser | null> {
    return this.prisma.user.findUnique({ where: { id }, select: safeUserSelect });
  }

  /**
   * С passwordHash — только для AuthService.
   *
   * Возвращает модель целиком, потому что `AuthService.validateUser` сверяет пароль
   * через `UsersService.verifyPassword`. Единственный путь сюда — `GetUserByEmailQuery`.
   * Результат нельзя отдавать в HTTP-ответ напрямую: сначала `toSafeUser` из `AuthService`.
   *
   * @param email Email пользователя (в схеме `@unique`).
   * @returns Полного пользователя вместе с `passwordHash` либо `null`, если email не найден.
   * @throws Ничего не бросает: на `null` вызывающая сторона отвечает 401 с тем же текстом,
   *   что и на неверный пароль, — чтобы не подтверждать наличие email в базе.
   */
  findByEmailWithHash(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  /**
   * Обновляет пользователя и отдаёт его без хеша пароля.
   *
   * @param id Идентификатор пользователя.
   * @param data Изменяемые поля; `UsersService.update` передаёт сюда `UpdateUserDto`,
   *   поэтому смена пароля этим путём не делается — `passwordHash` в DTO отсутствует.
   * @returns Обновлённого пользователя без `passwordHash`.
   * @throws {Prisma.PrismaClientKnownRequestError} Код `P2025`, если записи нет.
   *   В обычном потоке до этого не доходит: `UsersService.update` сначала зовёт `findOne`
   *   и отдаёт 404. Остаётся гонка — запись удалили между проверкой и обновлением.
   */
  updateSafe(id: string, data: Prisma.UserUpdateInput): Promise<SafeUser> {
    return this.prisma.user.update({ where: { id }, data, select: safeUserSelect });
  }

  /**
   * Удаляет пользователя и отдаёт удалённую запись без хеша пароля.
   *
   * Связанные счета, категории, транзакции и бюджеты уходят каскадом по правилам
   * `schema.prisma` — отдельной чистки здесь нет.
   *
   * @param id Идентификатор пользователя.
   * @returns Удалённого пользователя без `passwordHash`.
   * @throws {Prisma.PrismaClientKnownRequestError} Код `P2025`, если записи нет;
   *   как и в `updateSafe`, штатный 404 приходит раньше из `UsersService.remove`.
   */
  deleteSafe(id: string): Promise<SafeUser> {
    return this.prisma.user.delete({ where: { id }, select: safeUserSelect });
  }
}
