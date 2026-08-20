import { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { MetricCards } from './components/MetricCards';
import { CategoryBreakdownChart } from './components/CategoryBreakdownChart';
import { DailySpendingChart } from './components/DailySpendingChart';
import { TransactionTable } from './components/TransactionTable';
import { EditTransactionModal } from './components/EditTransactionModal';
import { RulesManagerModal } from './components/RulesManagerModal';
import { PinLockScreen } from './components/PinLockScreen';
import type { Transaction, StatsSummary } from './types';

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

  // Current Month: 'YYYY-MM' (default to current month)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Filters State
  const [currency, setCurrency] = useState('DOP');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
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

  // Apply dark mode class to html element
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

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    if (!authToken) return;
    try {
      const params = new URLSearchParams({
        month: selectedMonth,
        currency,
      });
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
  }, [selectedMonth, currency, authToken]);

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
  }, [page, limit, selectedMonth, currency, search, categoryFilter, statusFilter, authToken]);

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

    window.open(`/api/v1/transactions/export?${params.toString()}`, '_blank');
  };

  // If not authenticated, render PIN lock screen
  if (!authToken) {
    return <PinLockScreen onUnlock={handleUnlock} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased">
      
      {/* Top Navbar */}
      <Navbar
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        currency={currency}
        setCurrency={setCurrency}
        onRefresh={refreshAll}
        onOpenRules={() => setIsRulesModalOpen(true)}
        onExport={handleExport}
        onLock={handleLock}
        loading={loading}
      />

      {/* Main Container */}
      <main className="container mx-auto flex-1 px-4 py-6 sm:px-6 space-y-6 max-w-7xl">
        
        {/* 1. KPIs */}
        <MetricCards stats={stats} currency={currency} />

        {/* 2. Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CategoryBreakdownChart stats={stats} currency={currency} />
          <DailySpendingChart stats={stats} currency={currency} />
        </div>

        {/* 3. Transaction Table */}
        <TransactionTable
          transactions={transactions}
          total={totalTransactions}
          page={page}
          setPage={setPage}
          limit={limit}
          search={search}
          setSearch={setSearch}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onEdit={(tx) => setEditingTransaction(tx)}
          loading={loading}
        />

      </main>

      {/* Footer */}
      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        Banco BHD Transaction Tracker & Dashboard • Diseñado con React & Shadcn UI
      </footer>

      {/* Edit Modal */}
      <EditTransactionModal
        transaction={editingTransaction}
        isOpen={!!editingTransaction}
        onClose={() => setEditingTransaction(null)}
        onSave={handleSaveTransaction}
      />

      {/* Rules Modal */}
      <RulesManagerModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
      />

    </div>
  );
}

export default App;
