import { TransactionType } from '@expense-tracker/shared-types';
import { Badge } from '@/shared/ui/badge';
import { TRANSACTION_TYPE_LABELS } from '../model/types';

const VARIANT_BY_TYPE: Record<TransactionType, 'default' | 'secondary' | 'outline'> = {
  [TransactionType.INCOME]: 'default',
  [TransactionType.EXPENSE]: 'secondary',
  [TransactionType.TRANSFER]: 'outline',
};

export function TransactionTypeBadge({ type }: { type: TransactionType }) {
  return <Badge variant={VARIANT_BY_TYPE[type]}>{TRANSACTION_TYPE_LABELS[type]}</Badge>;
}
