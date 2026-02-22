'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiInstance } from '@/lib/api-instance';

export interface LinkRepaymentsResult {
  repaymentsLinked: number;
  interestLinked: number;
  loansStillUnpaid: number;
}

export function useLinkRepayments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiInstance.post<LinkRepaymentsResult>('/loan/link-repayments');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
