import { useMutation, useQueryClient } from '@tanstack/react-query';
import { paydayRitualKeys, paydayRitualService } from '@/entities/payday-ritual';

export function useCompletePaydayRitual(currency: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cycleKey: string) => paydayRitualService.complete(cycleKey, currency),
    onSuccess: (data) => queryClient.setQueryData(paydayRitualKeys.current(currency), data),
  });
}
