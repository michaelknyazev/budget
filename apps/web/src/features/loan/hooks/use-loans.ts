'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiInstance } from '@/lib/api-instance';
import { CreateLoanInput, UpdateLoanInput } from '@budget/schemas';

export interface Loan {
  id: string;
  title: string;
  amountLeft: string;
  monthlyPayment: string;
  currency: string;
  holder: string;
  loanNumber: string | null;
  isRepaid: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useLoans() {
  return useQuery<Loan[]>({
    queryKey: ['loans'],
    queryFn: async () => {
      const { data } = await apiInstance.get<Loan[]>('/loan');
      return data;
    },
  });
}

export function useCreateLoan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateLoanInput) => {
      const { data } = await apiInstance.post<Loan>('/loan', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    },
  });
}

export function useUpdateLoan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateLoanInput }) => {
      const { data } = await apiInstance.patch<Loan>(`/loan/${id}`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    },
  });
}

export function useDeleteLoan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiInstance.delete(`/loan/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    },
  });
}

export function useRecalculateLoans() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiInstance.post<{ created: number }>('/loan/recalculate');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
