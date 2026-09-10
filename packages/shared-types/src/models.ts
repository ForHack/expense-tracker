import type { AccountType, BudgetPeriod, TransactionType } from './enums';

/**
 * Сериализованные представления сущностей — то, что реально приходит по HTTP.
 * Decimal превращается в строку, даты — в ISO-строки.
 */

export interface User {
  id: string;
  email: string;
  name: string | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: string;
  currency: string;
  isArchived: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string | null;
  color: string | null;
  parentId: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  amount: string;
  type: TransactionType;
  date: string;
  note: string | null;
  userId: string;
  accountId: string;
  categoryId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Транзакция вместе с раскрытыми связями — для списков и карточек. */
export interface TransactionWithRelations extends Transaction {
  account: Account;
  category: Category | null;
}

export interface Budget {
  id: string;
  amount: string;
  period: BudgetPeriod;
  startDate: string;
  endDate: string | null;
  userId: string;
  categoryId: string;
  createdAt: string;
  updatedAt: string;
}
