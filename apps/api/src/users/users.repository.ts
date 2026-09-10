import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Пользователь без хеша пароля — то, что уходит наружу. */
export type SafeUser = Omit<User, 'passwordHash'>;

const safeUserSelect = {
  id: true,
  email: true,
  name: true,
  currency: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

/** Единственное место, где вызывается `prisma.user`. */
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  createSafe(data: Prisma.UserCreateInput): Promise<SafeUser> {
    return this.prisma.user.create({ data, select: safeUserSelect });
  }

  findMany(): Promise<SafeUser[]> {
    return this.prisma.user.findMany({
      select: safeUserSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string): Promise<SafeUser | null> {
    return this.prisma.user.findUnique({ where: { id }, select: safeUserSelect });
  }

  /** С passwordHash — только для AuthService. */
  findByEmailWithHash(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  updateSafe(id: string, data: Prisma.UserUpdateInput): Promise<SafeUser> {
    return this.prisma.user.update({ where: { id }, data, select: safeUserSelect });
  }

  deleteSafe(id: string): Promise<SafeUser> {
    return this.prisma.user.delete({ where: { id }, select: safeUserSelect });
  }
}
