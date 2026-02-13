'use client';

import { useQuery } from '@tanstack/react-query';
import { apiInstance } from '@/lib/api-instance';
import type { ImportHistoryItem, SkippedTransactionRecord } from '@budget/schemas';

export function useImportHistory() {
  return useQuery<ImportHistoryItem[]>({
    queryKey: ['import-history'],
    queryFn: async () => {
      const { data } = await apiInstance.get<ImportHistoryItem[]>('/bank-import');
      return data;
    },
  });
}

export function useSkippedTransactions(importId: string) {
  return useQuery<SkippedTransactionRecord[]>({
    queryKey: ['skipped-transactions', importId],
    queryFn: async () => {
      const { data } = await apiInstance.get<SkippedTransactionRecord[]>(
        `/bank-import/${importId}/skipped-transactions`,
      );
      return data;
    },
    enabled: !!importId,
  });
}
