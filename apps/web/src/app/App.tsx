import { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import { AuthScreen, useAuthSession } from '@/features/auth';
import { BankOnboarding } from '@/features/onboarding';
import { LegalAcceptanceScreen, LegalDocumentPage } from '@/features/legal';
import { usePeriodFilter } from '@/features/period-filter';
import { useThemeAndPrivacy } from '@/shared/hooks/useThemeAndPrivacy';
import { useStatsSummary } from '@/entities/stat';
import { useTransactions } from '@/entities/transaction';

const DashboardPage = lazy(async () => {
  const module = await import('@/pages/dashboard');
  return { default: module.DashboardPage };
});

export function App() {
  // Theme & Privacy Mode
  const { darkMode, setDarkMode, hideBalances, setHideBalances } = useThemeAndPrivacy();

  // Authentication & Session
  const {
    authToken,
    checkingSession,
    setupError,
    onboardingComplete,
    setOnboardingComplete,
    legalAcceptanceRequired,
    setLegalAcceptanceRequired,
    handleLock,
  } = useAuthSession();

  // Period Filter State
  const { periodSelection, handleApplyPeriod } = usePeriodFilter();

  // Transactions State & Operations
  const {
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
  } = useTransactions({
    authToken,
    periodSelection,
    onUnauthorized: () => void handleLock(),
  });

  // Statistics Summary
  const { stats, fetchStats } = useStatsSummary({
    authToken,
    currency,
    periodSelection,
    organizationFilter,
    onUnauthorized: () => void handleLock(),
  });

  // UI Modals
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  // Synchronized Refresh
  const refreshAll = useCallback(() => {
    if (authToken) {
      fetchStats();
      fetchTransactions();
    }
  }, [authToken, fetchStats, fetchTransactions]);

  // Initial and reactive refresh on filter changes
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // 10-minute background refresh cadence
  useEffect(() => {
    if (!authToken || !onboardingComplete || legalAcceptanceRequired) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') refreshAll();
    }, 10 * 60 * 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, [authToken, onboardingComplete, legalAcceptanceRequired, refreshAll]);

  const handleSaveAndRefresh = async (
    id: string,
    merchant: string,
    category: string,
    notes: string
  ) => {
    await handleSaveTransaction(id, merchant, category, notes, refreshAll);
  };

  // 1. Legal public pages route
  if (window.location.pathname.startsWith('/legal/')) {
    return <LegalDocumentPage />;
  }

  // 2. Unauthenticated Screen
  if (!authToken) {
    return <AuthScreen checkingSession={checkingSession} setupError={setupError} />;
  }

  // 3. Mandatory Legal Consent Screen
  if (legalAcceptanceRequired) {
    return (
      <LegalAcceptanceScreen
        authToken={authToken}
        onAccepted={() => setLegalAcceptanceRequired(false)}
        onLogout={() => void handleLock()}
      />
    );
  }

  // 4. Initial Bank Onboarding Screen
  if (!onboardingComplete) {
    return (
      <BankOnboarding
        authToken={authToken}
        onComplete={() => setOnboardingComplete(true)}
        onLogout={() => void handleLock()}
      />
    );
  }

  // 5. Main Dashboard View
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Cargando tu dashboard…
        </div>
      }
    >
      <DashboardPage
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        hideBalances={hideBalances}
        setHideBalances={setHideBalances}
        currentPeriod={periodSelection}
        onApplyPeriod={(selection) => handleApplyPeriod(selection, () => setPage(1))}
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
        onExport={handleExportCsv}
        onLock={() => void handleLock()}
        onAccountDeleted={() => void handleLock()}
        editingTransaction={editingTransaction}
        setEditingTransaction={setEditingTransaction}
        onSaveTransaction={handleSaveAndRefresh}
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
