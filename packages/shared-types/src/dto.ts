import type { AccountType, BudgetPeriod, TransactionType } from './enums';
import type { User } from './models';

/**
 * Формы запросов на запись. Совпадают с DTO-классами в apps/api/src/*\/dto.
 * Update-варианты — Partial от Create, как PartialType в Nest.
 *
 * `userId` в этих формах нет: сервер берёт владельца из JWT.
 */

export interface RegisterDto {
  email: string;
  password: string;
  name?: string;
  currency?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

/** Ответ POST /auth/register и POST /auth/login. */
export interface AuthResponse {
  accessToken: string;
  user: User;
}

export type CreateUserDto = RegisterDto;

export type UpdateUserDto = Partial<Omit<CreateUserDto, 'password'>>;

export interface CreateAccountDto {
  name: string;
  type: AccountType;
  balance?: string;
  currency?: string;
}

export type UpdateAccountDto = Partial<CreateAccountDto>;

export interface CreateCategoryDto {
  name: string;
  type: TransactionType;
  icon?: string;
  color?: string;
  parentId?: string;
}

export type UpdateCategoryDto = Partial<CreateCategoryDto>;

export interface CreateTransactionDto {
  amount: string;
  type: TransactionType;
  date: string;
  note?: string;
  accountId: string;
  categoryId?: string;
}

export type UpdateTransactionDto = Partial<CreateTransactionDto>;

export interface CreateBudgetDto {
  amount: string;
  period: BudgetPeriod;
  startDate: string;
  endDate?: string;
  categoryId: string;
}

export type UpdateBudgetDto = Partial<CreateBudgetDto>;
