import { useQuery } from '@tanstack/react-query';
import { recurringService } from '../api/recurring.service';

export const recurringKeys = {
  all: ['recurring'] as const,
  radar: (currency: string) => ['recurring', 'radar', currency] as const,
};

export function useRecurringRadar(currency: string) {
  return useQuery({
    queryKey: recurringKeys.radar(currency),
    queryFn: ({ signal }) => recurringService.radar(currency, signal),
    refetchInterval: (query) => ['PENDING', 'PROCESSING'].includes(query.state.data?.analysisStatus || '') ? 2_500 : false,
  });
}
