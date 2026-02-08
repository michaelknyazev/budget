'use client';
import { useQuery } from '@tanstack/react-query';
import { apiInstance } from '@/lib/api-instance';
import type { MonthlyReportResponse } from '@budget/schemas';

export function useMonthlyReport(
  month: number,
  year: number,
  currency: string,
) {
  return useQuery<MonthlyReportResponse>({
    queryKey: ['monthly-report', month, year, currency],
    queryFn: async () => {
      const { data } = await apiInstance.get<MonthlyReportResponse>(
        '/dashboard/monthly-report',
        { params: { month, year, currency } },
      );
      return data;
    },
  });
}
