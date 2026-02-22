import { Suspense } from 'react';
import { TransactionsView } from '@/features/transaction/components/TransactionsView';
import { PageLoader } from '@/components/shared/PageLoader';

export default function TransactionsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <TransactionsView />
    </Suspense>
  );
}
