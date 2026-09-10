import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SafeUser, UsersRepository } from './users.repository';

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

export type { SafeUser };

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(dto: CreateUserDto): Promise<SafeUser> {
    const { password, ...rest } = dto;
    return this.usersRepository.createSafe({
      ...rest,
      passwordHash: await UsersService.hashPassword(password),
    });
  }

  findAll(): Promise<SafeUser[]> {
    return this.usersRepository.findMany();
  }

  async findOne(id: string): Promise<SafeUser> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`Пользователь ${id} не найден`);
    }
    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<SafeUser> {
    await this.findOne(id);
    return this.usersRepository.updateSafe(id, dto);
  }

  async remove(id: string): Promise<SafeUser> {
    await this.findOne(id);
    return this.usersRepository.deleteSafe(id);
  }

  /**
   * scrypt из стандартной библиотеки, без внешних зависимостей.
   * Формат хеша: `<salt-hex>:<key-hex>`.
   */
  static async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const key = await scrypt(password, salt, 64);
    return `${salt}:${key.toString('hex')}`;
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    const [salt, key] = hash.split(':');
    if (!salt || !key) {
      return false;
    }
    const derived = await scrypt(password, salt, 64);
    const stored = Buffer.from(key, 'hex');
    return derived.length === stored.length && timingSafeEqual(derived, stored);
  }
}
