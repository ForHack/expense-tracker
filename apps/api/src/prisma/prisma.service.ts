import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * `PrismaClient`, живущий как провайдер Nest: подключение к БД открывается и закрывается
 * по хукам жизненного цикла. Доступен в любом сервисе без импорта — `PrismaModule` `@Global`.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  /**
   * Открывает соединение с БД при старте модуля.
   *
   * @returns Ничего; резолвится, когда соединение установлено.
   * @throws {Error} Prisma не смогла подключиться (недоступная БД, неверный `DATABASE_URL`) —
   *   приложение падает на старте.
   */
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  /**
   * Закрывает соединение при остановке приложения.
   *
   * @returns Ничего; резолвится после отключения.
   */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
