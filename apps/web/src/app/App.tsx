import { useState, useEffect, useCallback } from 'react';
import { DashboardPage } from '@/pages/dashboard';
import { PinLockScreen } from '@/features/auth-pin';
import type { Transaction } from '@/entities/transaction';
import type { StatsSummary } from '@/entities/stat';

export function App() {
  // Auth State
  const [authToken, setAuthToken] = useState<string | null>(() => {
    return (
      localStorage.getItem('bills_device_token') ||
      sessionStorage.getItem('bills_session_token') ||
      null
    );
  });

  // Theme State
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('bills_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Current Month: 'YYYY-MM'
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

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
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [loading, setLoading] = useState(false);

  // Modals State
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

  // Apply dark mode class
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('bills_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('bills_theme', 'light');
    }
  }, [darkMode]);

  // Handle Unlock
  const handleUnlock = (token: string, remember: boolean) => {
    setAuthToken(token);
    if (remember) {
      localStorage.setItem('bills_device_token', token);
    } else {
      sessionStorage.setItem('bills_session_token', token);
    }
  };

  // Handle Lock
  const handleLock = () => {
    setAuthToken(null);
    localStorage.removeItem('bills_device_token');
    sessionStorage.removeItem('bills_session_token');
  };

  // Reset Filters Handler
  const handleResetFilters = useCallback(() => {
    setSearch('');
    setCategoryFilter('');
    setStatusFilter('');
    setOrganizationFilter('');
    setTypeFilter('');
    setPage(1);
  }, []);

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    if (!authToken) return;
    try {
      const params = new URLSearchParams({
        month: selectedMonth,
        currency,
      });
      if (organizationFilter) params.append('organization', organizationFilter);

      const res = await fetch(`/api/v1/stats/summary?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const json = await res.json();
        setStats(json.data);
      } else if (res.status === 401) {
        handleLock();
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, [selectedMonth, currency, organizationFilter, authToken]);

  // Fetch Transactions
  const fetchTransactions = useCallback(async () => {
    if (!authToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        month: selectedMonth,
        currency,
      });
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
        setTotalTransactions(json.pagination?.total || 0);
      } else if (res.status === 401) {
        handleLock();
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, selectedMonth, currency, search, categoryFilter, statusFilter, organizationFilter, typeFilter, authToken]);

  // Refresh All
  const refreshAll = useCallback(() => {
    if (authToken) {
      fetchStats();
      fetchTransactions();
    }
  }, [authToken, fetchStats, fetchTransactions]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Save edited transaction
  const handleSaveTransaction = async (
    id: string,
    merchant: string,
    category: string,
    notes: string
  ) => {
    const res = await fetch(`/api/v1/transactions/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ merchant, category, notes }),
    });
    if (res.ok) {
      refreshAll();
    }
  };

  // Export to CSV
  const handleExport = () => {
    const params = new URLSearchParams({
      month: selectedMonth,
      currency,
      format: 'csv',
    });
    if (search) params.append('search', search);
    if (categoryFilter) params.append('category', categoryFilter);
    if (organizationFilter) params.append('organization', organizationFilter);
    if (typeFilter) params.append('transactionType', typeFilter);

    window.open(`/api/v1/transactions/export?${params.toString()}`, '_blank');
  };

  if (!authToken) {
    return <PinLockScreen onUnlock={handleUnlock} />;
  }

  return (
    <DashboardPage
      darkMode={darkMode}
      setDarkMode={setDarkMode}
      selectedMonth={selectedMonth}
      setSelectedMonth={setSelectedMonth}
      currency={currency}
      setCurrency={setCurrency}
      stats={stats}
      transactions={transactions}
      totalTransactions={totalTransactions}
      loading={loading}
      page={page}
      setPage={setPage}
      limit={limit}
      search={search}
      setSearch={setSearch}
      categoryFilter={categoryFilter}
      setCategoryFilter={setCategoryFilter}
      statusFilter={statusFilter}
      setStatusFilter={setStatusFilter}
      organizationFilter={organizationFilter}
      setOrganizationFilter={setOrganizationFilter}
      typeFilter={typeFilter}
      setTypeFilter={setTypeFilter}
      onResetFilters={handleResetFilters}
      onRefresh={refreshAll}
      onExport={handleExport}
      onLock={handleLock}
      editingTransaction={editingTransaction}
      setEditingTransaction={setEditingTransaction}
      onSaveTransaction={handleSaveTransaction}
      isRulesModalOpen={isRulesModalOpen}
      setIsRulesModalOpen={setIsRulesModalOpen}
    />
  );
}

export default App;
