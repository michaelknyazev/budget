'use client';
import { useQuery } from '@tanstack/react-query';
import { apiInstance } from '@/lib/api-instance';
import type { YearlySummaryResponse } from '@budget/schemas';

export function useYearlySummary(year: number, currency: string) {
  return useQuery<YearlySummaryResponse>({
    queryKey: ['yearly-summary', year, currency],
    queryFn: async () => {
      const { data } = await apiInstance.get<YearlySummaryResponse>(
        '/dashboard/yearly-summary',
        { params: { year, currency } },
      );
      return data;
    },
  });
}
