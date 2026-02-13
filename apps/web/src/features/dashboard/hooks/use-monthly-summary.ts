'use client';
import { useQuery } from '@tanstack/react-query';
import { apiInstance } from '@/lib/api-instance';

export interface MonthlySummary {
  grossIncome: number;
  totalExpenses: number;
  loanCost: number;
  netIncome: number;
  depositBalance: number;
  topCategories: Array<{
    name: string;
    amount: number;
  }>;
}

export function useMonthlySummary(month: number, year: number, currency: string) {
  return useQuery<MonthlySummary>({
    queryKey: ['monthly-summary', month, year, currency],
    queryFn: async () => {
      const { data } = await apiInstance.get<MonthlySummary>('/dashboard/monthly', {
        params: { month, year, currency },
      });
      return data;
    },
  });
}
