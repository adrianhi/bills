import { useState, useCallback } from 'react';
import type { StatsSummary } from './types';
import type { PeriodSelection } from '@/features/period-filter';

interface UseStatsSummaryProps {
  authToken: string | null;
  currency: string;
  periodSelection: PeriodSelection;
  organizationFilter?: string;
  onUnauthorized?: () => void;
}

export function useStatsSummary({
  authToken,
  currency,
  periodSelection,
  organizationFilter,
  onUnauthorized,
}: UseStatsSummaryProps) {
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!authToken) return;
    setLoadingStats(true);
    try {
      const params = new URLSearchParams({ currency });
      if (periodSelection.startDate) params.append('startDate', periodSelection.startDate);
      if (periodSelection.endDate) params.append('endDate', periodSelection.endDate);
      if (periodSelection.month && !periodSelection.startDate) params.append('month', periodSelection.month);
      if (organizationFilter) params.append('organization', organizationFilter);

      const res = await fetch(`/api/v1/stats/summary?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const json = await res.json();
        setStats(json.data);
      } else if (res.status === 401 && onUnauthorized) {
        onUnauthorized();
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }, [authToken, currency, periodSelection, organizationFilter, onUnauthorized]);

  return {
    stats,
    loadingStats,
    fetchStats,
    setStats,
  };
}
