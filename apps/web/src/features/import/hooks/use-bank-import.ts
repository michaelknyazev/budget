'use client';
import { useMutation } from '@tanstack/react-query';
import { apiInstance } from '@/lib/api-instance';

export interface ImportResult {
  bankImportId: string;
  created: number;
  skipped: number;
  totalTransactions: number;
  loanCostTotal: number;
}

export function useBankImport() {
  return useMutation<ImportResult, Error, { file: File; bankAccountId?: string }>({
    mutationFn: async ({ file, bankAccountId }) => {
      const formData = new FormData();
      formData.append('file', file);
      if (bankAccountId) {
        formData.append('bankAccountId', bankAccountId);
      }

      const { data } = await apiInstance.post<ImportResult>('/bank-import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return data;
    },
  });
}
