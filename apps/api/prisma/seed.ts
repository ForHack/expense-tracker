import { AccountType, PrismaClient, TransactionType } from '@prisma/client';
import { UsersService } from '../src/users/users.service';

const prisma = new PrismaClient();

/** Пароль демо-пользователя: под ним можно сразу залогиниться через POST /api/auth/login. */
const DEMO_PASSWORD = 'password123';

const DEFAULT_CATEGORIES: Array<{ name: string; type: TransactionType; icon: string }> = [
  { name: 'Продукты', type: TransactionType.EXPENSE, icon: '🛒' },
  { name: 'Транспорт', type: TransactionType.EXPENSE, icon: '🚌' },
  { name: 'Жильё', type: TransactionType.EXPENSE, icon: '🏠' },
  { name: 'Кафе и рестораны', type: TransactionType.EXPENSE, icon: '🍽️' },
  { name: 'Здоровье', type: TransactionType.EXPENSE, icon: '💊' },
  { name: 'Развлечения', type: TransactionType.EXPENSE, icon: '🎬' },
  { name: 'Зарплата', type: TransactionType.INCOME, icon: '💰' },
  { name: 'Подработка', type: TransactionType.INCOME, icon: '💼' },
];

async function main() {
  const passwordHash = await UsersService.hashPassword(DEMO_PASSWORD);
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: { passwordHash },
    create: {
      email: 'demo@example.com',
      passwordHash,
      name: 'Demo User',
      currency: 'USD',
    },
  });

  await prisma.account.upsert({
    where: { userId_name: { userId: user.id, name: 'Наличные' } },
    update: {},
    create: {
      name: 'Наличные',
      type: AccountType.CASH,
      currency: user.currency,
      userId: user.id,
    },
  });

  for (const category of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: {
        userId_name_type: { userId: user.id, name: category.name, type: category.type },
      },
      update: {},
      create: { ...category, userId: user.id },
    });
  }

  console.log(`Сид выполнен: пользователь ${user.email} / пароль ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
