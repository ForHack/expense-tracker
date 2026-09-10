import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Budget } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateBudgetDto): Promise<Budget> {
    return this.budgetsService.create(userId, dto);
  }

  @Get()
  findAll(@CurrentUser('id') userId: string): Promise<Budget[]> {
    return this.budgetsService.findAll(userId);
  }

  @Get(':id')
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string): Promise<Budget> {
    return this.budgetsService.findOne(id, userId);
  }

  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBudgetDto,
  ): Promise<Budget> {
    return this.budgetsService.update(id, userId, dto);
  }

  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string): Promise<Budget> {
    return this.budgetsService.remove(id, userId);
  }
}
