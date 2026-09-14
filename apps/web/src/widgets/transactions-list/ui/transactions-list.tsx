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
          <TableRow>
            <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
              Транзакций нет — измените фильтры или добавьте первую.
            </TableCell>
          </TableRow>
        )}

        {transactions.map((transaction) => (
          <TableRow key={transaction.id}>
            <TableCell className="whitespace-nowrap text-muted-foreground">
              {formatDate(transaction.date)}
            </TableCell>
            <TableCell className="max-w-64 truncate">
              {transaction.note ?? <span className="text-muted-foreground">—</span>}
            </TableCell>
            <TableCell>
              {transaction.category?.name ?? (
                <span className="text-muted-foreground">Без категории</span>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground">{transaction.account.name}</TableCell>
            <TableCell>
              <TransactionTypeBadge type={transaction.type} />
            </TableCell>
            <TableCell
              className={`text-right font-medium whitespace-nowrap ${amountColorClass(transaction.type)}`}
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
