import { Injectable, NotFoundException } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Budget } from '@prisma/client';
import { AssertCategoryOwnedQuery } from '../categories/cqrs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Injectable()
export class BudgetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBus: QueryBus,
  ) {}

  async create(userId: string, dto: CreateBudgetDto): Promise<Budget> {
    const { startDate, endDate, ...rest } = dto;
    await this.assertCategoryOwned(userId, dto.categoryId);
    return this.prisma.budget.create({
      data: {
        ...rest,
        userId,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
      },
    });
  }

  findAll(userId: string): Promise<Budget[]> {
    return this.prisma.budget.findMany({
      where: { userId },
      include: { category: true },
      orderBy: { startDate: 'desc' },
    });
  }

  /** Ищет только среди бюджетов пользователя: чужой id неотличим от несуществующего. */
  async findOne(id: string, userId: string): Promise<Budget> {
    const budget = await this.prisma.budget.findFirst({
      where: { id, userId },
      include: { category: true },
    });
    if (!budget) {
      throw new NotFoundException(`Бюджет ${id} не найден`);
    }
    return budget;
  }

  async update(id: string, userId: string, dto: UpdateBudgetDto): Promise<Budget> {
    await this.findOne(id, userId);
    await this.assertCategoryOwned(userId, dto.categoryId);
    const { startDate, endDate, ...rest } = dto;
    return this.prisma.budget.update({
      where: { id },
      data: {
        ...rest,
        ...(startDate ? { startDate: new Date(startDate) } : {}),
        ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
      },
    });
  }

  async remove(id: string, userId: string): Promise<Budget> {
    await this.findOne(id, userId);
    return this.prisma.budget.delete({ where: { id } });
  }

  /** Категория принадлежит другому модулю — проверяем через QueryBus. */
  private async assertCategoryOwned(userId: string, categoryId?: string): Promise<void> {
    if (categoryId) {
      await this.queryBus.execute(new AssertCategoryOwnedQuery(categoryId, userId));
    }
  }
}