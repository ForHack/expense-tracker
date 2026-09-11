import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Category, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { QueryCategoriesDto } from './dto/query-categories.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

/** Страховка от бесконечного обхода, если в данных всё же оказался цикл. */
const MAX_PARENT_DEPTH = 20;

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateCategoryDto): Promise<Category> {
    if (dto.parentId) {
      await this.assertParentUsable(userId, dto.parentId);
    }
    try {
      return await this.prisma.category.create({ data: { ...dto, userId } });
    } catch (error) {
      throw this.toDuplicateError(error, dto.name);
    }
  }

  findAll(userId: string, filters: QueryCategoriesDto = {}): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: { userId, type: filters.type, parentId: filters.parentId },
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
    if (dto.parentId) {
      await this.assertParentUsable(userId, dto.parentId, id);
    }
    try {
      return await this.prisma.category.update({ where: { id }, data: dto });
    } catch (error) {
      throw this.toDuplicateError(error, dto.name);
    }
  }

  /**
   * Каскады заданы в схеме: подкатегории всплывают в корень (`parentId` → null),
   * транзакции остаются без категории (`categoryId` → null),
   * а бюджеты по этой категории удаляются вместе с ней (`onDelete: Cascade`).
   */
  async remove(id: string, userId: string): Promise<Category> {
    await this.findOne(id, userId);
    return this.prisma.category.delete({ where: { id } });
  }

  /**
   * Нарушение `@@unique([userId, name, type])` — это конфликт данных, а не сбой сервера:
   * переводим P2002 в 409. Остальные ошибки пробрасываем как есть.
   */
  private toDuplicateError(error: unknown, name?: string): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      (error.meta?.target as string[] | undefined)?.includes('name')
    ) {
      return new ConflictException(
        name
          ? `Категория «${name}» с таким типом уже существует`
          : 'Категория с таким именем и типом уже существует',
      );
    }
    return error;
  }

  /**
   * Родитель обязан принадлежать тому же пользователю (иначе 404, как и для любой чужой записи)
   * и не может лежать в поддереве самой категории — иначе в дереве появится цикл.
   */
  private async assertParentUsable(
    userId: string,
    parentId: string,
    selfId?: string,
  ): Promise<void> {
    if (parentId === selfId) {
      throw new BadRequestException('Категория не может быть родителем самой себе');
    }

    const parent = await this.findOne(parentId, userId);

    let ancestorId = parent.parentId;
    for (let depth = 0; ancestorId && depth < MAX_PARENT_DEPTH; depth += 1) {
      if (ancestorId === selfId) {
        throw new BadRequestException('Нельзя сделать родителем собственного потомка');
      }
      const ancestor = await this.prisma.category.findFirst({
        where: { id: ancestorId, userId },
        select: { parentId: true },
      });
      ancestorId = ancestor?.parentId ?? null;
    }
  }
}
