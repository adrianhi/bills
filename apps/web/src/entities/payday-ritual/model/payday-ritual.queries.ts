import { useQuery } from '@tanstack/react-query';
import { paydayRitualService } from '../api/payday-ritual.service';

export const paydayRitualKeys = {
  all: ['payday-ritual'] as const,
  current: (currency: string) => ['payday-ritual', 'current', currency] as const,
};

export function usePaydayRitual(currency: string) {
  return useQuery({
    queryKey: paydayRitualKeys.current(currency),
    queryFn: ({ signal }) => paydayRitualService.current(currency, signal),
  });
}
