import { useState, useCallback } from 'react';
import type { PeriodSelection } from '@/entities/period';

export const formatReadableMonth = (monthStr: string) => {
  if (!monthStr) return '';
  const [y, m] = monthStr.split('-').map(Number);
  const date = new Date(y, m - 1, 1);
  const formatted = date.toLocaleDateString('es-DO', { month: 'long', year: 'numeric' });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

export const getCurrentMonthStr = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export function usePeriodFilter(initialMonth?: string) {
  const [periodSelection, setPeriodSelection] = useState<PeriodSelection>(() => {
    const curMonth = initialMonth || getCurrentMonthStr();
    return {
      month: curMonth,
      label: formatReadableMonth(curMonth),
    };
  });

  const handleApplyPeriod = useCallback((selection: PeriodSelection, resetPage?: () => void) => {
    setPeriodSelection(selection);
    if (resetPage) resetPage();
  }, []);

  return {
    periodSelection,
    setPeriodSelection,
    handleApplyPeriod,
    formatReadableMonth,
    getCurrentMonthStr,
  };
}
