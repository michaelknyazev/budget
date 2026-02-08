'use client';

import { useQuery } from '@tanstack/react-query';
import { apiInstance } from '@/lib/api-instance';

/**
 * Fetches the latest exchange rates (rateToGel) for all tracked currencies.
 * Returns a record like { GEL: 1, USD: 2.65, EUR: 2.95, ... }
 */
export function useLatestRates() {
  return useQuery<Record<string, number>>({
    queryKey: ['exchange-rates', 'latest'],
    queryFn: async () => {
      const { data } = await apiInstance.get<Record<string, number>>('/exchange-rate/latest');
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
