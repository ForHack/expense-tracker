import { TransactionType } from '@expense-tracker/shared-types';

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  [TransactionType.INCOME]: 'Доход',
  [TransactionType.EXPENSE]: 'Расход',
  [TransactionType.TRANSFER]: 'Перевод',
};

/** Порядок для селектов и легенд — от частого к редкому. */
export const TRANSACTION_TYPES: TransactionType[] = [
  TransactionType.EXPENSE,
  TransactionType.INCOME,
  TransactionType.TRANSFER,
];

/**
 * Знак перед суммой. В БД суммы всегда положительные, направление задаёт `type`,
 * поэтому минус у расхода — чисто оформление.
 */
export function amountSign(type: TransactionType): string {
  if (type === TransactionType.INCOME) {
    return '+';
  }
  return type === TransactionType.EXPENSE ? '−' : '';
}

export function amountColorClass(type: TransactionType): string {
  if (type === TransactionType.INCOME) {
    return 'text-emerald-600';
  }
  return type === TransactionType.EXPENSE ? 'text-rose-600' : 'text-muted-foreground';
}

/** Значение, которым в URL и селектах кодируется «все» — пустую строку Select не принимает. */
export const ALL_FILTER_VALUE = 'all';

export function isTransactionType(value: unknown): value is TransactionType {
  return typeof value === 'string' && value in TRANSACTION_TYPE_LABELS;
}
