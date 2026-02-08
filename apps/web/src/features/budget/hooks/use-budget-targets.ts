'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiInstance } from '@/lib/api-instance';
import {
  CreateBudgetTargetInput,
  UpdateBudgetTargetInput,
  QueryBudgetTargetInput,
} from '@budget/schemas';

export interface BudgetTarget {
  id: string;
  categoryId: string | null;
  month: number;
  year: number;
  targetAmount: string;
  currency: string;
  type: 'EXPENSE' | 'INCOME';
  createdAt: string;
  updatedAt: string;
  category?: {
    id: string;
    name: string;
  } | null;
}

export function useBudgetTargets(params?: QueryBudgetTargetInput) {
  return useQuery<BudgetTarget[]>({
    queryKey: ['budget-targets', params],
    queryFn: async () => {
      const { data } = await apiInstance.get<BudgetTarget[]>('/budget-target');
      // Filter client-side if params provided
      if (params) {
        return data.filter(
          (target) => target.month === params.month && target.year === params.year,
        );
      }
      return data;
    },
  });
}

export function useCreateBudgetTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBudgetTargetInput) => {
      const { data } = await apiInstance.post<BudgetTarget>('/budget-target', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-targets'] });
    },
  });
}

export function useUpdateBudgetTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateBudgetTargetInput;
    }) => {
      const { data } = await apiInstance.patch<BudgetTarget>(`/budget-target/${id}`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-targets'] });
    },
  });
}

export function useDeleteBudgetTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiInstance.delete(`/budget-target/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-targets'] });
    },
  });
}
