import type { TransactionWithRelations } from '@expense-tracker/shared-types';
import { TransactionTypeBadge, amountColorClass, amountSign } from '@/entities/transaction';
import { formatDate, formatMoney } from '@/shared/lib/format';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

/** Таблица транзакций. Пустое состояние — отдельной строкой, чтобы не терять шапку. */
export function TransactionsList({
  transactions,
  currency,
}: {
  transactions: TransactionWithRelations[];
  currency: string;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-28">Дата</TableHead>
          <TableHead>Описание</TableHead>
          <TableHead>Категория</TableHead>
          <TableHead>Счёт</TableHead>
          <TableHead className="w-28">Тип</TableHead>
          <TableHead className="text-right">Сумма</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {transactions.length === 0 && (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={6} className="py-16 text-center">
              <p className="display-title text-lg text-muted-foreground">Пока пусто</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Измените фильтры или добавьте первую операцию.
              </p>
            </TableCell>
          </TableRow>
        )}

        {transactions.map((transaction) => (
          <TableRow key={transaction.id}>
            <TableCell className="whitespace-nowrap text-muted-foreground">
              {formatDate(transaction.date)}
            </TableCell>
            <TableCell className="max-w-64 truncate font-medium">
              {transaction.note ?? <span className="text-muted-foreground">—</span>}
            </TableCell>
            <TableCell>
              {transaction.category ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold">
                  <span className="size-1.5 rounded-full bg-primary" aria-hidden />
                  {transaction.category.name}
                </span>
              ) : (
                <span className="text-muted-foreground">Без категории</span>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground">{transaction.account.name}</TableCell>
            <TableCell>
              <TransactionTypeBadge type={transaction.type} />
            </TableCell>
            <TableCell
              className={`display-title text-right text-sm whitespace-nowrap ${amountColorClass(transaction.type)}`}
            >
              {amountSign(transaction.type)}
              {formatMoney(transaction.amount, transaction.account.currency || currency)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
