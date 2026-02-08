'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiInstance } from '@/lib/api-instance';
import {
  TransactionResponse,
  QueryTransactionsInput,
  CreateTransactionInput,
  UpdateTransactionInput,
} from '@budget/schemas';

export interface TransactionsResponse {
  transactions: TransactionResponse[];
  total: number;
}

export function useTransactions(filters: QueryTransactionsInput) {
  return useQuery<TransactionsResponse>({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      // Build params object, excluding undefined values
      const params: Record<string, string | number> = {};
      if (filters.page !== undefined) params.page = filters.page;
      if (filters.pageSize !== undefined) params.pageSize = filters.pageSize;
      if (filters.month !== undefined) params.month = filters.month;
      if (filters.year !== undefined) params.year = filters.year;
      if (filters.type) params.type = filters.type;
      if (filters.currency) params.currency = filters.currency;
      if (filters.categoryId) params.categoryId = filters.categoryId;
      if (filters.merchantName) params.merchantName = filters.merchantName;
      if (filters.mccCode !== undefined) params.mccCode = filters.mccCode;

      const { data } = await apiInstance.get<TransactionsResponse>('/transaction', {
        params,
      });
      return data;
    },
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      const { data } = await apiInstance.post<TransactionResponse>('/transaction', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateTransactionInput }) => {
      const { data } = await apiInstance.patch<TransactionResponse>(`/transaction/${id}`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiInstance.delete(`/transaction/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
