'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiInstance } from '@/lib/api-instance';
import type {
  CreatePlannedIncomeInput,
  UpdatePlannedIncomeInput,
  PlannedIncomeComparisonResponse,
} from '@budget/schemas';

export interface PlannedIncome {
  id: string;
  month: number;
  year: number;
  plannedAmount: string;
  notes: string | null;
  incomeSource: {
    id: string;
    name: string;
    currency: string;
  };
  createdAt: string;
  updatedAt: string;
}

export function usePlannedIncome(params: {
  year: number;
  month?: number;
}) {
  return useQuery<PlannedIncome[]>({
    queryKey: ['planned-income', params],
    queryFn: async () => {
      const { data } = await apiInstance.get<PlannedIncome[]>(
        '/planned-income',
        { params },
      );
      return data;
    },
  });
}

export function usePlannedIncomeComparison(params: {
  month: number;
  year: number;
  currency: string;
}) {
  return useQuery<PlannedIncomeComparisonResponse>({
    queryKey: ['planned-income-comparison', params],
    queryFn: async () => {
      const { data } =
        await apiInstance.get<PlannedIncomeComparisonResponse>(
          '/planned-income/comparison',
          { params },
        );
      return data;
    },
  });
}

export function useCreatePlannedIncome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePlannedIncomeInput) => {
      const { data } = await apiInstance.post<PlannedIncome>(
        '/planned-income',
        input,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planned-income'] });
      queryClient.invalidateQueries({
        queryKey: ['planned-income-comparison'],
      });
    },
  });
}

export function useUpdatePlannedIncome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdatePlannedIncomeInput;
    }) => {
      const { data } = await apiInstance.patch<PlannedIncome>(
        `/planned-income/${id}`,
        input,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planned-income'] });
      queryClient.invalidateQueries({
        queryKey: ['planned-income-comparison'],
      });
    },
  });
}

export function useDeletePlannedIncome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiInstance.delete(`/planned-income/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planned-income'] });
      queryClient.invalidateQueries({
        queryKey: ['planned-income-comparison'],
      });
    },
  });
}

export function useCopyPreviousMonth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { month: number; year: number }) => {
      const { data } = await apiInstance.post<PlannedIncome[]>(
        '/planned-income/copy-previous',
        params,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planned-income'] });
      queryClient.invalidateQueries({
        queryKey: ['planned-income-comparison'],
      });
    },
  });
}
