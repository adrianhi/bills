import { useCallback, useMemo, useState } from 'react';
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
}

export function useTransactions({ authToken, periodSelection }: UseTransactionsProps) {
  const queryClient = useQueryClient();
  const [currency, setCurrency] = useState('DOP');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [organizationFilter, setOrganizationFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const limit = 20;

  const filters = useMemo<TransactionFilters>(() => ({
    page,
    limit,
    currency,
    month: periodSelection.startDate ? undefined : periodSelection.month,
    startDate: periodSelection.startDate,
    endDate: periodSelection.endDate,
    search: search || undefined,
    category: categoryFilter || undefined,
    status: statusFilter || undefined,
    organization: organizationFilter || undefined,
    transactionType: typeFilter || undefined,
  }), [page, currency, periodSelection, search, categoryFilter, statusFilter, organizationFilter, typeFilter]);

  const query = useQuery({
    queryKey: transactionKeys.list(filters),
    queryFn: ({ signal }) => transactionService.list(filters, signal),
    enabled: Boolean(authToken),
    refetchInterval: authToken ? 30_000 : false,
  });

  const updateMutation = useMutation({
    mutationFn: transactionService.update,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      await queryClient.invalidateQueries({ queryKey: ['stats'] });
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
    loading: query.isLoading || query.isFetching,
    error: query.error,
    editingTransaction, setEditingTransaction,
    fetchTransactions: query.refetch,
    handleResetFilters, handleSaveTransaction, handleExportCsv,
  };
}
