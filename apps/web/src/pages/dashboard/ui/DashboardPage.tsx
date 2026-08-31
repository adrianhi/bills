import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ProductGuideState } from '@bills/contracts';
import { useLocation, useNavigate } from 'react-router-dom';
import { Navbar } from '@/widgets/navbar';
import { APP_SECTIONS, BottomNav, type AppSection } from '@/widgets/bottom-nav';
import { connectionService } from '@/entities/connection/api/connection.service';
import { useDashboardController } from '../model/useDashboardController';
import { DashboardSidebar } from './DashboardSidebar';
import { PeriodToolbar } from './PeriodToolbar';
import { DashboardModals } from './DashboardModals';
import { HomeSection } from './sections/HomeSection';
import { TransactionsSection } from './sections/TransactionsSection';
import { AnalyticsSection } from './sections/AnalyticsSection';
import { MoreSection } from './sections/MoreSection';

interface DashboardPageProps {
  authToken: string;
  productGuide: ProductGuideState;
  onProductGuideChange: (state: ProductGuideState) => void;
  onLock: () => void;
  onAccountDeleted: () => void;
}

const SECTION_TITLES: Record<AppSection, string> = {
  home: 'Inicio',
  transactions: 'Movimientos',
  analytics: 'Analítica',
  more: 'Más',
};

function sectionFromPath(pathname: string): AppSection | null {
  if (pathname.includes('/movimientos')) return 'transactions';
  if (pathname.includes('/analitica')) return 'analytics';
  if (pathname.includes('/mas')) return 'more';
  if (pathname.includes('/inicio')) return 'home';
  return null;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  authToken,
  productGuide,
  onProductGuideChange,
  onLock: lockSession,
  onAccountDeleted,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeSection = sectionFromPath(location.pathname) ?? 'home';
  const model = useDashboardController(authToken, lockSession, activeSection);
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
    statsError,
    loadingStats,
    refreshingStats,
    transactions,
    totalTransactions,
    loading,
    refreshing,
    error,
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
    onLock,
    editingTransaction,
    setEditingTransaction,
    onSaveTransaction,
    isRulesModalOpen,
    setIsRulesModalOpen,
    isQuickAddOpen,
    setIsQuickAddOpen,
  } = model;

  const [isSettingsOpen, setIsSettingsOpen] = useState(
    () => new URLSearchParams(window.location.search).get('settings') === 'connections'
  );
  const [isTourInviteOpen, setIsTourInviteOpen] = useState(
    () => productGuide.versionSeen !== productGuide.currentVersion
  );
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const connectionsQuery = useQuery({
    queryKey: ['inbox-connections', 'dashboard'],
    queryFn: ({ signal }) => connectionService.listInboxConnections(signal),
    gcTime: 0,
    refetchInterval: (query) =>
      query.state.data?.some(
        (c) => c.currentJob?.status === 'PENDING' || c.currentJob?.status === 'PROCESSING'
      )
        ? 2_500
        : false,
  });

  useEffect(() => {
    if (!sectionFromPath(location.pathname)) {
      navigate('/app/inicio', { replace: true });
    }
  }, [location.pathname, navigate]);

  const activeFiltersCount = [
    categoryFilter,
    statusFilter,
    organizationFilter,
    typeFilter,
  ].filter(Boolean).length;

  const primaryConnection =
    connectionsQuery.data?.find((c) => c.status !== 'REVOKED') ??
    connectionsQuery.data?.[0];

  const requiresBankSelection =
    connectionsQuery.data?.some(
      (c) => c.status === 'ACTIVE' && c.requiresBankSelection
    ) ?? false;

  const selectSection = (
    section: AppSection,
    replace = false,
    behavior: ScrollBehavior = 'smooth'
  ) => {
    const target = APP_SECTIONS.find((item) => item.id === section);
    if (target) navigate(target.path, { replace });
    window.scrollTo({ top: 0, behavior });
  };

  const periodToolbarNode = (
    <PeriodToolbar
      currentPeriod={currentPeriod}
      onApplyPeriod={onApplyPeriod}
      currency={currency}
      setCurrency={setCurrency}
    />
  );

  const currentFilters = useMemo(
    () => ({
      category: categoryFilter,
      status: statusFilter,
      organization: organizationFilter,
      transactionType: typeFilter,
      search,
    }),
    [categoryFilter, statusFilter, organizationFilter, typeFilter, search]
  );

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <DashboardSidebar
        activeSection={activeSection}
        onSelectSection={selectSection}
        onQuickAdd={() => setIsQuickAddOpen(true)}
        activeFiltersCount={activeFiltersCount}
      />

      <Navbar
        title={SECTION_TITLES[activeSection]}
        hideBalances={hideBalances}
        setHideBalances={setHideBalances}
        onRefresh={onRefresh}
        onOpenSettings={() => setIsSettingsOpen(true)}
        refreshing={refreshing || refreshingStats}
      />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-5 pb-[calc(9rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-8 lg:ml-64 lg:pb-10">
        {activeSection === 'home' && (
          <HomeSection
            periodToolbar={periodToolbarNode}
            primaryConnection={primaryConnection}
            connectionsLoading={connectionsQuery.isLoading}
            connectionsFailed={connectionsQuery.isError}
            onOpenConnections={() => setIsSettingsOpen(true)}
            stats={stats}
            statsError={statsError}
            loadingStats={loadingStats}
            currency={currency}
            hideBalances={hideBalances}
            onRefresh={onRefresh}
            transactions={transactions}
            loadingTransactions={loading}
            onViewAllTransactions={() => selectSection('transactions')}
            onSelectTransaction={setEditingTransaction}
            onAddManual={() => setIsQuickAddOpen(true)}
          />
        )}

        {activeSection === 'transactions' && (
          <TransactionsSection
            periodToolbar={periodToolbarNode}
            transactions={transactions}
            totalTransactions={totalTransactions}
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
            onEdit={setEditingTransaction}
            onExport={() => setIsExportModalOpen(true)}
            loading={loading}
            refreshing={refreshing}
            error={error instanceof Error ? error : null}
            onRetry={onRefresh}
            hideBalances={hideBalances}
            onOpenConnections={() => setIsSettingsOpen(true)}
            onAddManual={() => setIsQuickAddOpen(true)}
          />
        )}

        {activeSection === 'analytics' && (
          <AnalyticsSection
            periodToolbar={periodToolbarNode}
            stats={stats}
            statsError={statsError}
            loadingStats={loadingStats}
            currency={currency}
            hideBalances={hideBalances}
            onRefresh={onRefresh}
          />
        )}

        {activeSection === 'more' && (
          <MoreSection
            currentPeriod={currentPeriod}
            currency={currency}
            filters={currentFilters}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onRepeatTour={() => {
              setIsTourInviteOpen(false);
              setIsTourOpen(true);
            }}
            onOpenRules={() => setIsRulesModalOpen(true)}
            onOpenExportModal={() => setIsExportModalOpen(true)}
            onLock={onLock}
          />
        )}
      </main>

      <BottomNav
        activeSection={activeSection}
        onSelectSection={selectSection}
        onQuickAdd={() => setIsQuickAddOpen(true)}
        activeFiltersCount={activeFiltersCount}
      />

      <DashboardModals
        authToken={authToken}
        activeSection={activeSection}
        onNavigate={(sec) => selectSection(sec, true, 'auto')}
        isQuickAddOpen={isQuickAddOpen}
        setIsQuickAddOpen={setIsQuickAddOpen}
        onRefresh={onRefresh}
        editingTransaction={editingTransaction}
        setEditingTransaction={setEditingTransaction}
        onSaveTransaction={onSaveTransaction}
        isRulesModalOpen={isRulesModalOpen}
        setIsRulesModalOpen={setIsRulesModalOpen}
        isSettingsOpen={isSettingsOpen}
        setIsSettingsOpen={setIsSettingsOpen}
        requiresBankSelection={requiresBankSelection}
        onAccountDeleted={onAccountDeleted}
        isTourInviteOpen={isTourInviteOpen}
        setIsTourInviteOpen={setIsTourInviteOpen}
        isTourOpen={isTourOpen}
        setIsTourOpen={setIsTourOpen}
        onProductGuideChange={onProductGuideChange}
        isExportModalOpen={isExportModalOpen}
        setIsExportModalOpen={setIsExportModalOpen}
        currentPeriod={currentPeriod}
        currency={currency}
        filters={currentFilters}
      />
    </div>
  );
};
