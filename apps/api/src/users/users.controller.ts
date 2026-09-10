import { Body, Controller, Delete, Get, Patch } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { SafeUser, UsersService } from './users.service';

/**
 * Только операции над собой: ролей нет, поэтому листинга всех пользователей и
 * правки чужих профилей быть не должно. Регистрация живёт в POST /api/auth/register.
 */
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  findMe(@CurrentUser('id') userId: string): Promise<SafeUser> {
    return this.usersService.findOne(userId);
  }

  @Patch('me')
  updateMe(@CurrentUser('id') userId: string, @Body() dto: UpdateUserDto): Promise<SafeUser> {
    return this.usersService.update(userId, dto);
  }

  @Delete('me')
  removeMe(@CurrentUser('id') userId: string): Promise<SafeUser> {
    return this.usersService.remove(userId);
  }
}
