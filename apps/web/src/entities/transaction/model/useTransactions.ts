import { useState, useCallback } from 'react';
import type { Transaction } from './types';
import type { PeriodSelection } from '@/features/period-filter';

interface UseTransactionsProps {
  authToken: string | null;
  periodSelection: PeriodSelection;
  onUnauthorized?: () => void;
}

export function useTransactions({
  authToken,
  periodSelection,
  onUnauthorized,
}: UseTransactionsProps) {
  // Filters State
  const [currency, setCurrency] = useState('DOP');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [organizationFilter, setOrganizationFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Data State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [loading, setLoading] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Fetch Transactions
  const fetchTransactions = useCallback(async () => {
    if (!authToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        currency,
      });
      if (periodSelection.startDate) params.append('startDate', periodSelection.startDate);
      if (periodSelection.endDate) params.append('endDate', periodSelection.endDate);
      if (periodSelection.month && !periodSelection.startDate) params.append('month', periodSelection.month);
      if (search) params.append('search', search);
      if (categoryFilter) params.append('category', categoryFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (organizationFilter) params.append('organization', organizationFilter);
      if (typeFilter) params.append('transactionType', typeFilter);

      const res = await fetch(`/api/v1/transactions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const json = await res.json();
        setTransactions(json.data || []);
        setTotalTransactions(
          json.pagination?.totalItems ??
          json.pagination?.total ??
          json.summary?.totalTransactions ??
          json.data?.length ??
          0
        );
      } else if (res.status === 401 && onUnauthorized) {
        onUnauthorized();
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [
    authToken,
    page,
    limit,
    currency,
    periodSelection,
    search,
    categoryFilter,
    statusFilter,
    organizationFilter,
    typeFilter,
    onUnauthorized,
  ]);

  // Reset Filters
  const handleResetFilters = useCallback(() => {
    setSearch('');
    setCategoryFilter('');
    setStatusFilter('');
    setOrganizationFilter('');
    setTypeFilter('');
    setPage(1);
  }, []);

  // Save edited transaction
  const handleSaveTransaction = useCallback(
    async (id: string, merchant: string, category: string, notes: string, onSaved?: () => void) => {
      if (!authToken) return;
      const res = await fetch(`/api/v1/transactions/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ merchant, category, notes }),
      });
      if (res.ok) {
        if (onSaved) onSaved();
        else void fetchTransactions();
      }
    },
    [authToken, fetchTransactions]
  );

  // Export to CSV
  const handleExportCsv = useCallback(async () => {
    if (!authToken) return;
    const params = new URLSearchParams({
      currency,
      format: 'csv',
    });
    if (periodSelection.startDate) params.append('startDate', periodSelection.startDate);
    if (periodSelection.endDate) params.append('endDate', periodSelection.endDate);
    if (periodSelection.month && !periodSelection.startDate) params.append('month', periodSelection.month);
    if (search) params.append('search', search);
    if (categoryFilter) params.append('category', categoryFilter);
    if (organizationFilter) params.append('organization', organizationFilter);
    if (typeFilter) params.append('transactionType', typeFilter);

    const response = await fetch(`/api/v1/transactions/export?${params.toString()}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (response.status === 401 && onUnauthorized) {
      onUnauthorized();
      return;
    }
    if (!response.ok) return;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bills-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [authToken, currency, periodSelection, search, categoryFilter, organizationFilter, typeFilter, onUnauthorized]);

  return {
    currency,
    setCurrency,
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    organizationFilter,
    setOrganizationFilter,
    typeFilter,
    setTypeFilter,
    page,
    setPage,
    limit,
    transactions,
    totalTransactions,
    loading,
    editingTransaction,
    setEditingTransaction,
    fetchTransactions,
    handleResetFilters,
    handleSaveTransaction,
    handleExportCsv,
  };
}
