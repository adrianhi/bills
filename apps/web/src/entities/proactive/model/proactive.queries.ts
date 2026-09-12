import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProactiveActionDto, ProactiveFeedDto, WeeklyCheckinDto } from '@bills/contracts';
import { proactiveService } from '../api/proactive.service';

export const proactiveKeys = {
  all: ['proactive'] as const,
  feed: (currency: string) => [...proactiveKeys.all, 'feed', currency] as const,
  weeklyCheckin: (currency: string) => [...proactiveKeys.all, 'weekly-checkin', currency] as const,
  weeklyDigestPreview: (currency: string) => [...proactiveKeys.all, 'weekly-digest-preview', currency] as const,
};

export function useProactiveFeed(currency: string) {
  return useQuery({
    queryKey: proactiveKeys.feed(currency),
    queryFn: ({ signal }) => proactiveService.feed(currency, signal),
    staleTime: 60_000,
  });
}

export function useWeeklyCheckin(currency: string) {
  return useQuery({
    queryKey: proactiveKeys.weeklyCheckin(currency),
    queryFn: ({ signal }) => proactiveService.weeklyCheckin(currency, signal),
    staleTime: 60_000,
  });
}

export function useCompleteWeeklyCheckin(currency: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (weekKey: string) => proactiveService.completeWeeklyCheckin(weekKey, currency),
    onSuccess: (updated: WeeklyCheckinDto) => {
      queryClient.setQueryData(proactiveKeys.weeklyCheckin(currency), updated);
      queryClient.invalidateQueries({ queryKey: proactiveKeys.feed(currency) });
    },
  });
}

export function useSimulateExpense() {
  return useMutation({
    mutationFn: proactiveService.simulateExpense,
  });
}

export function useWeeklyDigestPreview(currency: string, enabled = true) {
  return useQuery({
    queryKey: proactiveKeys.weeklyDigestPreview(currency),
    queryFn: ({ signal }) => proactiveService.weeklyDigestPreview(currency, signal),
    enabled,
    staleTime: 60_000,
  });
}

export function useSendWeeklyDigestTest() {
  return useMutation({
    mutationFn: proactiveService.sendWeeklyDigestTest,
  });
}



export function useDismissProactiveAction(currency: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (actionId: string) => proactiveService.dismiss(actionId),
    onMutate: async (actionId: string) => {
      await queryClient.cancelQueries({ queryKey: proactiveKeys.feed(currency) });
      const previous = queryClient.getQueryData<ProactiveFeedDto>(proactiveKeys.feed(currency));
      if (previous) {
        queryClient.setQueryData<ProactiveFeedDto>(proactiveKeys.feed(currency), {
          ...previous,
          actions: previous.actions.filter((a: ProactiveActionDto) => a.id !== actionId),
          counts: {
            ...previous.counts,
            total: Math.max(0, previous.counts.total - 1),
          },
        });
      }
      return { previous };
    },
    onError: (_err, _actionId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(proactiveKeys.feed(currency), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: proactiveKeys.feed(currency) });
    },
  });
}
