import { useState } from 'react';
import { useStatsSummary } from '@/entities/stat';
import { useTransactions } from '@/entities/transaction';
import { usePeriodFilter } from '@/features/period-filter';
import { useThemeAndPrivacy } from '@/shared/hooks/useThemeAndPrivacy';

type DashboardSection = 'home' | 'transactions' | 'budget' | 'analytics';

export function useDashboardController(authToken: string, onLock: () => void, section: DashboardSection) {
  const theme = useThemeAndPrivacy();
  const { periodSelection, handleApplyPeriod } = usePeriodFilter();
  const transactionsEnabled = section === 'home' || section === 'transactions';
  const statsEnabled = section === 'home' || section === 'analytics';
  const transactions = useTransactions({ authToken, periodSelection, onUnauthorized: onLock, enabled: transactionsEnabled });
  const statsQuery = useStatsSummary({
    authToken, currency: transactions.currency, periodSelection,
    onUnauthorized: onLock, enabled: statsEnabled,
  });
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const refreshAll = () => {
    if (transactionsEnabled) void transactions.fetchTransactions();
    if (statsEnabled) void statsQuery.fetchStats();
  };
  const saveTransaction = async (id: string, merchant: string, category: string, notes: string) => {
    await transactions.handleSaveTransaction(id, merchant, category, notes);
  };

  return {
    ...theme,
    currentPeriod: periodSelection,
    onApplyPeriod: (selection: Parameters<typeof handleApplyPeriod>[0]) => handleApplyPeriod(selection, () => transactions.setPage(1)),
    ...transactions,
    stats: statsQuery.stats,
    statsError: statsQuery.error,
    loadingStats: statsQuery.loadingStats,
    refreshingStats: statsQuery.refreshingStats,
    onRefresh: refreshAll,
    onExport: transactions.handleExportCsv,
    onResetFilters: transactions.handleResetFilters,
    onLock,
    onSaveTransaction: saveTransaction,
    isRulesModalOpen, setIsRulesModalOpen, isQuickAddOpen, setIsQuickAddOpen,
  };
}
