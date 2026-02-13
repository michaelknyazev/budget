'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiInstance } from '@/lib/api-instance';
import type {
  CreateBudgetTargetInput,
  UpdateBudgetTargetInput,
  QueryBudgetTargetInput,
  BudgetTargetComparisonResponse,
} from '@budget/schemas';

export interface BudgetTarget {
  id: string;
  name: string;
  categoryId: string | null;
  month: number;
  year: number;
  targetAmount: string;
  currency: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  category?: {
    id: string;
    name: string;
  } | null;
}

export function useBudgetTargets(params?: { year: number; month?: number }) {
  return useQuery<BudgetTarget[]>({
    queryKey: ['budget-targets', params],
    queryFn: async () => {
      const { data } = await apiInstance.get<BudgetTarget[]>('/budget-target');
      if (params) {
        return data.filter(
          (target) =>
            target.year === params.year &&
            (params.month === undefined || target.month === params.month),
        );
      }
      return data;
    },
  });
}

export function useBudgetTargetComparison(params: {
  month: number;
  year: number;
  currency: string;
}) {
  return useQuery<BudgetTargetComparisonResponse>({
    queryKey: ['budget-target-comparison', params],
    queryFn: async () => {
      const { data } =
        await apiInstance.get<BudgetTargetComparisonResponse>(
          '/budget-target/comparison',
          { params },
        );
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
      queryClient.invalidateQueries({ queryKey: ['budget-target-comparison'] });
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
      queryClient.invalidateQueries({ queryKey: ['budget-target-comparison'] });
    },
  });
}

export function useDeleteBudgetTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiInstance.delete(`/budget-target/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-targets'] });
      queryClient.invalidateQueries({ queryKey: ['budget-target-comparison'] });
    },
  });
}

export function useCopyPreviousMonthTargets() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { month: number; year: number }) => {
      const { data } = await apiInstance.post<BudgetTarget[]>(
        '/budget-target/copy-previous',
        params,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-targets'] });
      queryClient.invalidateQueries({ queryKey: ['budget-target-comparison'] });
    },
  });
}
