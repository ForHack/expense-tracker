import { UsersService } from './users.service';

describe('UsersService: хеширование паролей', () => {
  it('verifyPassword принимает пароль, которым был получен хеш', async () => {
    const hash = await UsersService.hashPassword('password123');

    await expect(UsersService.verifyPassword('password123', hash)).resolves.toBe(true);
  });

  it('verifyPassword отвергает неверный пароль', async () => {
    const hash = await UsersService.hashPassword('password123');

    await expect(UsersService.verifyPassword('wrong-password', hash)).resolves.toBe(false);
  });

  it('одинаковые пароли дают разные хеши — соль случайна', async () => {
    const first = await UsersService.hashPassword('password123');
    const second = await UsersService.hashPassword('password123');

    expect(first).not.toEqual(second);
  });

  it('verifyPassword возвращает false на хеше без разделителя', async () => {
    await expect(UsersService.verifyPassword('password123', 'битый-хеш')).resolves.toBe(false);
  });
});
