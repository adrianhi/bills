import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TransactionFilters } from '@bills/contracts';
import type { PeriodSelection } from '@/entities/period';
import { downloadBlob } from '@/shared/lib';
import { transactionService } from '../api/transaction.service';
import { transactionKeys } from '../api/query-keys';
import type { Transaction } from './types';

interface UseTransactionsProps {
  authToken: string | null;
  periodSelection: PeriodSelection;
  onUnauthorized?: () => void;
  enabled?: boolean;
}

export function useTransactions({ authToken, periodSelection, enabled = true }: UseTransactionsProps) {
  const queryClient = useQueryClient();
  const [currency, setCurrency] = useState('DOP');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [organizationFilter, setOrganizationFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const limit = 20;

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const filters = useMemo<TransactionFilters>(() => ({
    page,
    limit,
    currency,
    month: periodSelection.startDate ? undefined : periodSelection.month,
    startDate: periodSelection.startDate,
    endDate: periodSelection.endDate,
    search: debouncedSearch || undefined,
    category: categoryFilter || undefined,
    status: statusFilter || undefined,
    organization: organizationFilter || undefined,
    transactionType: typeFilter || undefined,
  }), [page, currency, periodSelection, debouncedSearch, categoryFilter, statusFilter, organizationFilter, typeFilter]);

  const query = useQuery({
    queryKey: transactionKeys.list(filters),
    queryFn: ({ signal }) => transactionService.list(filters, signal),
    enabled: Boolean(authToken) && enabled,
    placeholderData: (previous) => previous,
  });

  const updateMutation = useMutation({
    mutationFn: transactionService.update,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      await queryClient.invalidateQueries({ queryKey: ['stats'] });
      await queryClient.invalidateQueries({ queryKey: ['budgets'] });
      await queryClient.invalidateQueries({ queryKey: ['category-rules'] });
    },
  });

  const handleResetFilters = useCallback(() => {
    setSearch('');
    setCategoryFilter('');
    setStatusFilter('');
    setOrganizationFilter('');
    setTypeFilter('');
    setPage(1);
  }, []);

  const handleSaveTransaction = useCallback(async (
    id: string,
    merchant: string,
    category: string,
    notes: string,
    onSaved?: () => void,
  ) => {
    await updateMutation.mutateAsync({ id, merchant, category, notes });
    onSaved?.();
  }, [updateMutation]);

  const handleExportCsv = useCallback(async () => {
    const blob = await transactionService.exportCsv(filters);
    downloadBlob(blob, `bills-export-${new Date().toISOString().slice(0, 10)}.csv`);
  }, [filters]);

  return {
    currency, setCurrency, search, setSearch, categoryFilter, setCategoryFilter,
    statusFilter, setStatusFilter, organizationFilter, setOrganizationFilter,
    typeFilter, setTypeFilter, page, setPage, limit,
    transactions: query.data?.data ?? [],
    totalTransactions: query.data?.pagination.totalItems ?? query.data?.pagination.total ?? 0,
    loading: query.isLoading,
    refreshing: query.isFetching && !query.isLoading,
    error: query.error,
    editingTransaction, setEditingTransaction,
    fetchTransactions: query.refetch,
    handleResetFilters, handleSaveTransaction, handleExportCsv,
  };
}
