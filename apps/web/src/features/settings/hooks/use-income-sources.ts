'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiInstance } from '@/lib/api-instance';
import {
  CreateIncomeSourceInput,
  UpdateIncomeSourceInput,
} from '@budget/schemas';

export interface IncomeSource {
  id: string;
  name: string;
  currency: string;
  defaultAmount: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useIncomeSources() {
  return useQuery<IncomeSource[]>({
    queryKey: ['income-sources'],
    queryFn: async () => {
      const { data } = await apiInstance.get<IncomeSource[]>('/income-source');
      return data;
    },
  });
}

export function useCreateIncomeSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateIncomeSourceInput) => {
      const { data } = await apiInstance.post<IncomeSource>('/income-source', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income-sources'] });
    },
  });
}

export function useUpdateIncomeSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateIncomeSourceInput;
    }) => {
      const { data } = await apiInstance.patch<IncomeSource>(`/income-source/${id}`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income-sources'] });
    },
  });
}

export function useDeleteIncomeSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiInstance.delete(`/income-source/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income-sources'] });
    },
  });
}
