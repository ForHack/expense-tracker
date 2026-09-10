import { Injectable, NotFoundException } from '@nestjs/common';
import { Category, TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreateCategoryDto): Promise<Category> {
    return this.prisma.category.create({ data: { ...dto, userId } });
  }

  findAll(userId: string, filters: { type?: TransactionType } = {}): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: { userId, type: filters.type },
      orderBy: { name: 'asc' },
    });
  }

  /** Ищет только среди категорий пользователя: чужой id неотличим от несуществующего. */
  async findOne(id: string, userId: string): Promise<Category> {
    const category = await this.prisma.category.findFirst({
      where: { id, userId },
      include: { children: true },
    });
    if (!category) {
      throw new NotFoundException(`Категория ${id} не найдена`);
    }
    return category;
  }

  async update(id: string, userId: string, dto: UpdateCategoryDto): Promise<Category> {
    await this.findOne(id, userId);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: string, userId: string): Promise<Category> {
    await this.findOne(id, userId);
    return this.prisma.category.delete({ where: { id } });
  }
}
