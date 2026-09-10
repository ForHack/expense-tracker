import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Account } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateAccountDto): Promise<Account> {
    return this.accountsService.create(userId, dto);
  }

  @Get()
  findAll(@CurrentUser('id') userId: string): Promise<Account[]> {
    return this.accountsService.findAll(userId);
  }

  @Get(':id')
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string): Promise<Account> {
    return this.accountsService.findOne(id, userId);
  }

  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
  ): Promise<Account> {
    return this.accountsService.update(id, userId, dto);
  }

  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string): Promise<Account> {
    return this.accountsService.remove(id, userId);
  }
}
