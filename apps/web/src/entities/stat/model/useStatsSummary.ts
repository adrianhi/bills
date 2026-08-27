import { useState, useCallback, useRef } from 'react';
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
  const onUnauthorizedRef = useRef(onUnauthorized);
  onUnauthorizedRef.current = onUnauthorized;

  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const { startDate, endDate, month } = periodSelection;

  const fetchStats = useCallback(async () => {
    if (!authToken) return;
    setLoadingStats(true);
    try {
      const params = new URLSearchParams({ currency });
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (month && !startDate) params.append('month', month);
      if (organizationFilter) params.append('organization', organizationFilter);

      const res = await fetch(`/api/v1/stats/summary?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const json = await res.json();
        setStats(json.data);
      } else if (res.status === 401 && onUnauthorizedRef.current) {
        onUnauthorizedRef.current();
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }, [authToken, currency, startDate, endDate, month, organizationFilter]);

  return {
    stats,
    loadingStats,
    fetchStats,
    setStats,
  };
}
