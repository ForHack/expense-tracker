import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Category } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { QueryCategoriesDto } from './dto/query-categories.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateCategoryDto): Promise<Category> {
    return this.categoriesService.create(userId, dto);
  }

  @Get()
  findAll(
    @CurrentUser('id') userId: string,
    @Query() query: QueryCategoriesDto,
  ): Promise<Category[]> {
    return this.categoriesService.findAll(userId, query);
  }

  @Get(':id')
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string): Promise<Category> {
    return this.categoriesService.findOne(id, userId);
  }

  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<Category> {
    return this.categoriesService.update(id, userId, dto);
  }

  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string): Promise<Category> {
    return this.categoriesService.remove(id, userId);
  }
}
