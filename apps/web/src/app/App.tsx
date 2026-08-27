import { lazy, Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { AuthScreen } from '@/features/auth';
import { BankOnboarding } from '@/features/onboarding';
import { LegalAcceptanceScreen, LegalDocumentPage } from '@/features/legal';
import { supabase } from '@/shared/lib';
import { type PeriodSelection } from '@/features/period-filter';
import type { Transaction } from '@/entities/transaction';
import type { StatsSummary } from '@/entities/stat';

const DashboardPage = lazy(async () => {
  const module = await import('@/pages/dashboard');
  return { default: module.DashboardPage };
});

const formatReadableMonth = (monthStr: string) => {
  if (!monthStr) return '';
  const [y, m] = monthStr.split('-').map(Number);
  const date = new Date(y, m - 1, 1);
  const formatted = date.toLocaleDateString('es-DO', { month: 'long', year: 'numeric' });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

const getCurrentMonthStr = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export function App() {
  // Auth State
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [setupError, setSetupError] = useState('');
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [legalAcceptanceRequired, setLegalAcceptanceRequired] = useState(false);

  // Theme State
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('bills_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Privacy Mode State (Hide / Show Balances)
  const [hideBalances, setHideBalances] = useState(() => {
    return localStorage.getItem('bills_privacy_mode') === 'true';
  });

  const handleSetHideBalances = (val: boolean) => {
    setHideBalances(val);
    localStorage.setItem('bills_privacy_mode', String(val));
  };

  // Period State (Day, Range, Month, Presets)
  const [periodSelection, setPeriodSelection] = useState<PeriodSelection>(() => {
    const curMonth = getCurrentMonthStr();
    return {
      month: curMonth,
      label: formatReadableMonth(curMonth),
    };
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
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

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

  const handleLock = useCallback(async () => {
    setAuthToken(null);
    setOnboardingComplete(false);
    setLegalAcceptanceRequired(false);
    setSetupError('');
    await supabase?.auth.signOut();
  }, []);

  const activatingTokenRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    const activateSession = async (token?: string) => {
      if (!active) return;
      if (!token) {
        activatingTokenRef.current = null;
        setAuthToken(null);
        setCheckingSession(false);
        return;
      }

      if (activatingTokenRef.current === token) return;
      activatingTokenRef.current = token;

      setCheckingSession(true);
      setSetupError('');
      try {
        const response = await fetch('/api/v1/me/bootstrap', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error?.message || 'No se pudo preparar tu espacio personal.');
        }
        const body = await response.json().catch(() => null);
        if (active) {
          setAuthToken(token);
          setLegalAcceptanceRequired(Boolean(body?.data?.legalAcceptanceRequired));
          setOnboardingComplete(Boolean(body?.data?.onboardingComplete));
          setSetupError('');
        }
      } catch (error) {
        if (active) {
          setAuthToken(null);
          setSetupError(error instanceof Error ? error.message : 'No se pudo iniciar la sesión.');
        }
      } finally {
        activatingTokenRef.current = null;
        if (active) setCheckingSession(false);
      }
    };

    if (!supabase) {
      setCheckingSession(false);
      return () => {
        active = false;
      };
    }

    supabase.auth.getSession().then(({ data }) => activateSession(data.session?.access_token));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      void activateSession(session?.access_token);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Apply Period Selection
  const handleApplyPeriod = useCallback((selection: PeriodSelection) => {
    setPeriodSelection(selection);
    setPage(1);
  }, []);

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
        currency,
      });
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
      } else if (res.status === 401) {
        void handleLock();
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, [periodSelection, currency, organizationFilter, authToken, handleLock]);

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
      } else if (res.status === 401) {
        void handleLock();
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, periodSelection, currency, search, categoryFilter, statusFilter, organizationFilter, typeFilter, authToken, handleLock]);

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

  useEffect(() => {
    if (!authToken || !onboardingComplete || legalAcceptanceRequired) return;
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refreshAll();
    };
    const timer = window.setInterval(refreshWhenVisible, 30_000);
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [authToken, onboardingComplete, legalAcceptanceRequired, refreshAll]);

  // Save edited transaction
  const handleSaveTransaction = async (
    id: string,
    merchant: string,
    category: string,
    notes: string
  ) => {
    const res = await fetch(`/api/v1/transactions/${id}`, {
      method: 'PATCH',
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
  const handleExport = async () => {
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
    if (response.status === 401) {
      void handleLock();
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
  };

  if (window.location.pathname.startsWith('/legal/')) {
    return <LegalDocumentPage />;
  }

  if (!authToken) {
    return <AuthScreen checkingSession={checkingSession} setupError={setupError} />;
  }

  if (legalAcceptanceRequired) {
    return (
      <LegalAcceptanceScreen
        authToken={authToken}
        onAccepted={() => setLegalAcceptanceRequired(false)}
        onLogout={() => void handleLock()}
      />
    );
  }

  if (!onboardingComplete) {
    return (
      <BankOnboarding
        authToken={authToken}
        onComplete={() => setOnboardingComplete(true)}
        onLogout={() => void handleLock()}
      />
    );
  }

  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Cargando tu dashboard…</div>}>
      <DashboardPage
      darkMode={darkMode}
      setDarkMode={setDarkMode}
      hideBalances={hideBalances}
      setHideBalances={handleSetHideBalances}
      currentPeriod={periodSelection}
      onApplyPeriod={handleApplyPeriod}
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
      onLock={() => void handleLock()}
      onAccountDeleted={() => void handleLock()}
      editingTransaction={editingTransaction}
      setEditingTransaction={setEditingTransaction}
      onSaveTransaction={handleSaveTransaction}
      isRulesModalOpen={isRulesModalOpen}
      setIsRulesModalOpen={setIsRulesModalOpen}
      isQuickAddOpen={isQuickAddOpen}
      setIsQuickAddOpen={setIsQuickAddOpen}
      authToken={authToken}
      />
    </Suspense>
  );
}

export default App;

