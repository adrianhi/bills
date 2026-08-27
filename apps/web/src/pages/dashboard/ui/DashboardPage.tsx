import React, { useState, useEffect } from 'react';
import { Navbar } from '@/widgets/navbar';
import { BottomNav, type ActiveSection } from '@/widgets/bottom-nav';
import { MetricCards } from '@/widgets/metric-summary';
import { TransactionTable } from '@/widgets/transactions-table';
import { EditTransactionModal } from '@/features/edit-transaction';
import { RulesManagerModal } from '@/features/manage-rules';
import { QuickAddTransactionModal } from '@/features/quick-add';
import { AccountSettingsModal } from '@/features/account-settings';
import { useSearchParams } from 'react-router-dom';
import { useDashboardController } from '../model/useDashboardController';

const CategoryBreakdownChart = React.lazy(async () => {
  const module = await import('@/widgets/spending-charts/ui/CategoryBreakdownChart');
  return { default: module.CategoryBreakdownChart };
});
const DailySpendingChart = React.lazy(async () => {
  const module = await import('@/widgets/spending-charts/ui/DailySpendingChart');
  return { default: module.DailySpendingChart };
});

interface DashboardPageProps {
  authToken: string;
  onLock: () => void;
  onAccountDeleted: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ authToken, onLock: lockSession, onAccountDeleted }) => {
  const {
  darkMode,
  setDarkMode,
  hideBalances,
  setHideBalances,
  currentPeriod,
  onApplyPeriod,
  currency,
  setCurrency,
  stats,
  transactions,
  totalTransactions,
  loading,
  page,
  setPage,
  limit,
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
  onResetFilters,
  onRefresh,
  onExport,
  onLock,
  editingTransaction,
  setEditingTransaction,
  onSaveTransaction,
  isRulesModalOpen,
  setIsRulesModalOpen,
  isQuickAddOpen,
  setIsQuickAddOpen,
  } = useDashboardController(authToken, lockSession);
  const [searchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState<ActiveSection>('overview');
  const [isSettingsOpen, setIsSettingsOpen] = useState(
    () => searchParams.get('settings') === 'connections'
  );

  // Active filters count
  const activeFiltersCount = [
    categoryFilter ? 1 : 0,
    statusFilter ? 1 : 0,
    organizationFilter ? 1 : 0,
    typeFilter ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  // Dynamic scroll-spy to change bottom bar color and focus as user scrolls
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 220;
      const txEl = document.getElementById('transactions-section');
      const chartsEl = document.getElementById('charts-section');

      if (txEl && scrollPos >= txEl.offsetTop) {
        setActiveSection('transactions');
      } else if (chartsEl && scrollPos >= chartsEl.offsetTop) {
        setActiveSection('analytics');
      } else {
        setActiveSection('overview');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSelectSection = (sec: ActiveSection) => {
    setActiveSection(sec);
    if (sec === 'overview') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (sec === 'analytics') {
      const el = document.getElementById('charts-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else if (sec === 'transactions') {
      const el = document.getElementById('transactions-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased">
      {/* Top Navbar */}
      <Navbar
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        hideBalances={hideBalances}
        setHideBalances={setHideBalances}
        currentPeriod={currentPeriod}
        onApplyPeriod={onApplyPeriod}
        currency={currency}
        setCurrency={setCurrency}
        onRefresh={onRefresh}
        onOpenRules={() => setIsRulesModalOpen(true)}
        onQuickAdd={() => setIsQuickAddOpen(true)}
        onExport={onExport}
        onLock={onLock}
        onOpenSettings={() => setIsSettingsOpen(true)}
        loading={loading}
      />

      {/* Main Container */}
      <main className="container mx-auto flex-1 px-3.5 py-4 sm:px-6 sm:py-6 space-y-5 sm:space-y-6 max-w-7xl pb-28 md:pb-6">
        {/* 1. KPIs Overview Section */}
        <div id="overview-section" className="scroll-mt-20">
          <MetricCards stats={stats} currency={currency} hideBalances={hideBalances} />
        </div>

        {/* 2. Charts / Analytics Section */}
        <div id="charts-section" className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 scroll-mt-20">
          <React.Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}>
            <CategoryBreakdownChart stats={stats} currency={currency} />
            <DailySpendingChart stats={stats} currency={currency} />
          </React.Suspense>
        </div>

        {/* 3. Transaction Table & Filters Section */}
        <div id="transactions-section" className="scroll-mt-20">
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
            organizationFilter={organizationFilter}
            setOrganizationFilter={setOrganizationFilter}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            onResetFilters={onResetFilters}
            onEdit={(tx) => setEditingTransaction(tx)}
            onExport={onExport}
            loading={loading}
            hideBalances={hideBalances}
          />
        </div>
      </main>

      {/* Desktop Footer */}
      <footer className="border-t py-4 text-center text-xs text-muted-foreground hidden md:block">
        bills<span className="text-emerald-500 font-bold">.</span> • Control de Gastos Multi-Entidad & Analítica Financiera
      </footer>

      {/* Mobile Floating Oval Capsule Bottom Bar with Dynamic Color Focus (Apple Style) */}
      <BottomNav
        activeSection={activeSection}
        onSelectSection={handleSelectSection}
        onQuickAdd={() => setIsQuickAddOpen(true)}
        activeFiltersCount={activeFiltersCount}
      />

      {/* Quick Add Modal */}
      <QuickAddTransactionModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSuccess={onRefresh}
        authToken={authToken}
      />

      {/* Edit Modal */}
      <EditTransactionModal
        key={editingTransaction?.id ?? 'no-transaction'}
        transaction={editingTransaction}
        isOpen={!!editingTransaction}
        onClose={() => setEditingTransaction(null)}
        onSave={onSaveTransaction}
      />

      {/* Rules Modal */}
      <RulesManagerModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        authToken={authToken}
      />
      {authToken && <AccountSettingsModal
        authToken={authToken}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onAccountDeleted={onAccountDeleted}
      />}
    </div>
  );
};
