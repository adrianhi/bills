import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { PeriodSelection } from '@/entities/period';
import { statsService, type StatsFilters } from '../api/stats.service';

interface UseStatsSummaryProps {
  authToken: string | null;
  currency: string;
  periodSelection: PeriodSelection;
  organizationFilter?: string;
  onUnauthorized?: () => void;
  enabled?: boolean;
}

export function useStatsSummary({ authToken, currency, periodSelection, organizationFilter, enabled = true }: UseStatsSummaryProps) {
  const filters = useMemo<StatsFilters>(() => ({
    currency,
    month: periodSelection.startDate ? undefined : periodSelection.month,
    startDate: periodSelection.startDate,
    endDate: periodSelection.endDate,
    organization: organizationFilter || undefined,
  }), [currency, periodSelection, organizationFilter]);

  const query = useQuery({
    queryKey: ['stats', 'summary', filters],
    queryFn: ({ signal }) => statsService.summary(filters, signal),
    enabled: Boolean(authToken) && enabled,
    placeholderData: (previous) => previous,
  });

  return {
    stats: query.data ?? null,
    loadingStats: query.isLoading,
    refreshingStats: query.isFetching && !query.isLoading,
    fetchStats: query.refetch,
    error: query.error,
  };
}
