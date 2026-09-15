import { Injectable, NotFoundException } from '@nestjs/common';
import { Account } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreateAccountDto): Promise<Account> {
    return this.prisma.account.create({ data: { ...dto, userId } });
  }

  findAll(userId: string): Promise<Account[]> {
    return this.prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Возвращает счёт пользователя. Ищет только среди его счетов: чужой id неотличим
   * от несуществующего. Через этот метод `AssertAccountOwnedHandler` проверяет
   * принадлежность счёта при создании и обновлении транзакции.
   *
   * @param id Идентификатор счёта.
   * @param userId Идентификатор владельца из JWT.
   * @returns Найденный счёт.
   * @throws {NotFoundException} Счёта нет или он принадлежит другому пользователю.
   */
  async findOne(id: string, userId: string): Promise<Account> {
    const account = await this.prisma.account.findFirst({ where: { id, userId } });
    if (!account) {
      throw new NotFoundException(`Счёт ${id} не найден`);
    }
    return account;
  }

  async update(id: string, userId: string, dto: UpdateAccountDto): Promise<Account> {
    await this.findOne(id, userId);
    return this.prisma.account.update({ where: { id }, data: dto });
  }

  async remove(id: string, userId: string): Promise<Account> {
    await this.findOne(id, userId);
    return this.prisma.account.delete({ where: { id } });
  }
}
