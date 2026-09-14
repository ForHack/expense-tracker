import { redirect } from 'next/navigation';
import { fetchAccounts } from '@/entities/account';
import { fetchCategories } from '@/entities/category';
import { UserCard, getCurrentUser, getSessionToken } from '@/entities/session';
import { fetchSummary, fetchTransactions, isTransactionType } from '@/entities/transaction';
import { CreateTransactionDialog } from '@/features/create-transaction';
import { TransactionFilters } from '@/features/transaction-filters';
import { ROUTES } from '@/shared/config';
import { MonthSummary } from '@/widgets/month-summary';
import {
  TRANSACTIONS_PER_PAGE,
  TransactionsList,
  TransactionsPagination,
  buildTransactionsHref,
} from '@/widgets/transactions-list';

interface DashboardSearchParams {
  page?: string | string[];
  type?: string | string[];
  categoryId?: string | string[];
}

/** Первое значение параметра: `?type=A&type=B` даёт массив, Nest такому не обрадуется. */
function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

/**
 * Главный экран: профиль, сводка за текущий месяц, фильтры и список транзакций.
 * Данные грузит сервер — фильтры и страница берутся из URL, поэтому экран
 * восстанавливается по ссылке и обновляется через `router.refresh()` после записи.
 */
export async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<DashboardSearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const page = parsePage(first(params.page));
  const rawType = first(params.type);
  const type = isTransactionType(rawType) ? rawType : undefined;
  const categoryId = first(params.categoryId);

  const token = await getSessionToken();
  if (!token) {
    // Layout уже проверил сессию, но между проверками cookie могла истечь
    redirect(ROUTES.login);
  }

  const now = new Date();
  const month = now.getUTCMonth() + 1;
  const year = now.getUTCFullYear();

  const [user, summary, transactions, categories, accounts] = await Promise.all([
    getCurrentUser(),
    fetchSummary(token, { month, year }),
    fetchTransactions(token, { page, perPage: TRANSACTIONS_PER_PAGE, type, categoryId }),
    fetchCategories(token),
    fetchAccounts(token),
  ]);

  if (!user) {
    redirect(ROUTES.login);
  }

  const { meta } = transactions;
  if (meta.total > 0 && meta.page > meta.totalPages) {
    // Руками введённый `?page=999` иначе показал бы пустую таблицу и «Стр. 999 из 2»
    redirect(buildTransactionsHref(ROUTES.dashboard, meta.totalPages, { type, categoryId }));
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Обзор</h1>
        <CreateTransactionDialog accounts={accounts} categories={categories} />
      </header>

      <UserCard user={user} />

      <MonthSummary summary={summary} currency={user.currency} />

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Транзакции</h2>

        <TransactionFilters categories={categories} type={type} categoryId={categoryId} />

        <TransactionsList transactions={transactions.data} currency={user.currency} />

        <TransactionsPagination
          meta={transactions.meta}
          filters={{ type, categoryId }}
          pathname={ROUTES.dashboard}
        />
      </section>
    </div>
  );
}
