'use client';
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiInstance } from '@/lib/api-instance';

export interface SkippedDetail {
  date: string;
  amount: string;
  currency: string;
  rawDetails: string;
  reason: string;
}

export interface ImportResult {
  bankImportId: string;
  created: number;
  skipped: number;
  totalTransactions: number;
  loanCostTotal: number;
  accountIban: string;
  accountOwner: string;
  periodFrom: string;
  periodTo: string;
  startingBalance: Record<string, number>;
  endBalance: Record<string, number>;
  skippedDetails: SkippedDetail[];
}

/** Upload a single file and return the result. */
async function uploadFile(
  file: File,
  bankAccountId?: string,
): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  if (bankAccountId) {
    formData.append('bankAccountId', bankAccountId);
  }

  const { data } = await apiInstance.post<ImportResult>(
    '/bank-import',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}

/**
 * Returns a stable `importFile` function and an `invalidateAll` helper.
 * The component manages its own file-list state so each file can be
 * tracked individually (pending → uploading → success/error).
 */
export function useBankImport() {
  const queryClient = useQueryClient();

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['monthly-summary'] });
    queryClient.invalidateQueries({ queryKey: ['yearly-summary'] });
    queryClient.invalidateQueries({ queryKey: ['monthly-report'] });
    queryClient.invalidateQueries({ queryKey: ['planned-income-comparison'] });
    queryClient.invalidateQueries({ queryKey: ['import-history'] });
  }, [queryClient]);

  return { importFile: uploadFile, invalidateAll };
}
