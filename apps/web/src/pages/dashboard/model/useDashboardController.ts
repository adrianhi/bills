import { useState } from 'react';
import { useStatsSummary } from '@/entities/stat';
import { useTransactions } from '@/entities/transaction';
import { usePeriodFilter } from '@/features/period-filter';
import { useThemeAndPrivacy } from '@/shared/hooks/useThemeAndPrivacy';

export function useDashboardController(authToken: string, onLock: () => void) {
  const theme = useThemeAndPrivacy();
  const { periodSelection, handleApplyPeriod } = usePeriodFilter();
  const transactions = useTransactions({ authToken, periodSelection, onUnauthorized: onLock });
  const statsQuery = useStatsSummary({
    authToken, currency: transactions.currency, periodSelection,
    organizationFilter: transactions.organizationFilter, onUnauthorized: onLock,
  });
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const refreshAll = () => {
    void transactions.fetchTransactions(); void statsQuery.fetchStats();
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
    onRefresh: refreshAll,
    onExport: transactions.handleExportCsv,
    onResetFilters: transactions.handleResetFilters,
    onLock,
    onSaveTransaction: saveTransaction,
    isRulesModalOpen, setIsRulesModalOpen, isQuickAddOpen, setIsQuickAddOpen,
  };
}
