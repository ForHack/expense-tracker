import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { Prisma, User } from '@prisma/client';
import { CreateUserCommand } from '../users/cqrs';
import { GetUserByEmailQuery } from '../users/cqrs';
import { SafeUser, UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './types/jwt-payload';

export interface AuthResponse {
  accessToken: string;
  user: SafeUser;
}

/** Одинаковый текст для «нет такого email» и «неверный пароль» — не раскрываем, что есть в БД. */
const INVALID_CREDENTIALS = 'Неверный email или пароль';

/** Отбрасывает passwordHash явным перечислением полей, чтобы он не утёк в ответ. */
function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    currency: user.currency,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    try {
      const user = await this.commandBus.execute<CreateUserCommand, SafeUser>(
        new CreateUserCommand(dto.email, dto.password, dto.name, dto.currency),
      );
      return this.buildResponse(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        (error.meta?.target as string[] | undefined)?.includes('email')
      ) {
        throw new ConflictException('Пользователь с таким email уже существует');
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.validateUser(dto.email, dto.password);
    return this.buildResponse(toSafeUser(user));
  }

  /** Возвращает пользователя вместе с хешем; бросает 401 при любой неудаче. */
  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.queryBus.execute<GetUserByEmailQuery, User | null>(
      new GetUserByEmailQuery(email),
    );
    if (!user || !(await UsersService.verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    return user;
  }

  private async buildResponse(user: SafeUser): Promise<AuthResponse> {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    return { accessToken: await this.jwtService.signAsync(payload), user };
  }
}
