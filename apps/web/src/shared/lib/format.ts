/**
 * Форматирование значений для вывода. Единственное место, где строка-Decimal становится
 * числом: по HTTP суммы ходят строками, чтобы не терять точность, но Intl умеет только number.
 * В расчётах и запросах суммы остаются строками.
 */

const MONTHS = [
  'январь',
  'февраль',
  'март',
  'апрель',
  'май',
  'июнь',
  'июль',
  'август',
  'сентябрь',
  'октябрь',
  'ноябрь',
  'декабрь',
];

export function formatMoney(amount: string, currency: string): string {
  const value = Number(amount);
  if (Number.isNaN(value)) {
    return amount;
  }

  try {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    // Неизвестный код валюты роняет Intl — показываем сумму и код рядом
    return `${value.toFixed(2)} ${currency}`;
  }
}

/** ISO-строка даты → «14.09.2026». */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short' }).format(new Date(iso));
}

/** Номер месяца 1–12 → «сентябрь 2026». */
export function formatMonth(month: number, year: number): string {
  return `${MONTHS[month - 1] ?? month} ${year}`;
}
