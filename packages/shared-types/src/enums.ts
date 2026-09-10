/**
 * Зеркало enum-ов из apps/api/prisma/schema.prisma.
 * Держим отдельную копию, чтобы фронтенд не зависел от @prisma/client.
 * При изменении схемы обновлять оба файла.
 */

export const TransactionType = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
  TRANSFER: 'TRANSFER',
} as const;

export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];

export const AccountType = {
  CASH: 'CASH',
  BANK: 'BANK',
  CARD: 'CARD',
  SAVINGS: 'SAVINGS',
  OTHER: 'OTHER',
} as const;

export type AccountType = (typeof AccountType)[keyof typeof AccountType];

export const BudgetPeriod = {
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY',
} as const;

export type BudgetPeriod = (typeof BudgetPeriod)[keyof typeof BudgetPeriod];
