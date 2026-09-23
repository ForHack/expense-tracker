import { PagePlaceholder } from '@/widgets/page-placeholder';

export default function TransactionsPage() {
  return (
    <PagePlaceholder eyebrow="История операций" title="Все" highlight="транзакции">
      Список операций с фильтрами по счёту, категории и периоду.
    </PagePlaceholder>
  );
}
