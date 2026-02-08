'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiInstance } from '@/lib/api-instance';
import {
  CreateBankAccountInput,
  UpdateBankAccountInput,
} from '@budget/schemas';

export interface BankAccount {
  id: string;
  iban: string;
  bankName: string;
  bankCode: string | null;
  accountOwner: string;
  accountType: string;
  interestRate: number | null;
  effectiveRate: number | null;
  createdAt: string;
  updatedAt: string;
}

export function useBankAccounts() {
  return useQuery<BankAccount[]>({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const { data } = await apiInstance.get<BankAccount[]>('/bank-account');
      return data;
    },
  });
}

export function useCreateBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBankAccountInput) => {
      const { data } = await apiInstance.post<BankAccount>('/bank-account', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    },
  });
}

export function useUpdateBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateBankAccountInput;
    }) => {
      const { data } = await apiInstance.patch<BankAccount>(`/bank-account/${id}`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    },
  });
}

export function useDeleteBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiInstance.delete(`/bank-account/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    },
  });
}
