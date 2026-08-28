import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Download,
  Lock,
  Moon,
  Plus,
  ReceiptText,
  Settings,
  SlidersHorizontal,
  Sun,
} from 'lucide-react';
import { Navbar } from '@/widgets/navbar';
import { APP_SECTIONS, BottomNav, type AppSection } from '@/widgets/bottom-nav';
import { MetricCards } from '@/widgets/metric-summary';
import { TransactionTable } from '@/widgets/transactions-table';
import { EditTransactionModal } from '@/features/edit-transaction';
import { RulesManagerModal } from '@/features/manage-rules';
import { QuickAddTransactionModal } from '@/features/quick-add';
import { AccountSettingsModal } from '@/features/account-settings';
import { PeriodFilter } from '@/features/period-filter';
import { Button, Card, CardContent } from '@/shared/ui';
import { formatCurrency, formatDate } from '@/shared/lib';
import { isReceivedTransfer } from '@/entities/transaction/model/selectors';
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

function PageIntro({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function PeriodToolbar({ currentPeriod, onApplyPeriod, currency, setCurrency }: {
  currentPeriod: React.ComponentProps<typeof PeriodFilter>['currentSelection'];
  onApplyPeriod: React.ComponentProps<typeof PeriodFilter>['onApply'];
  currency: string;
  setCurrency: (currency: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-card p-2 shadow-sm sm:w-fit">
      <PeriodFilter currentSelection={currentPeriod} onApply={onApplyPeriod} />
      <div className="flex min-h-11 rounded-xl bg-muted p-1 text-xs font-bold" aria-label="Moneda">
        {['DOP', 'USD'].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCurrency(item)}
            className={`min-w-14 rounded-lg px-3 transition-colors ${currency === item ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
            aria-pressed={currency === item}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

function LoadingCards() {
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Cargando resumen">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-32 animate-pulse rounded-2xl bg-muted" />)}</div>;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ authToken, onLock: lockSession, onAccountDeleted }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeSection = sectionFromPath(location.pathname) ?? 'home';
  const model = useDashboardController(authToken, lockSession, activeSection);
  const {
    darkMode, setDarkMode, hideBalances, setHideBalances,
    currentPeriod, onApplyPeriod, currency, setCurrency,
    stats, statsError, loadingStats, refreshingStats,
    transactions, totalTransactions, loading, refreshing, error,
    page, setPage, limit, search, setSearch,
    categoryFilter, setCategoryFilter, statusFilter, setStatusFilter,
    organizationFilter, setOrganizationFilter, typeFilter, setTypeFilter,
    onResetFilters, onRefresh, onExport, onLock,
    editingTransaction, setEditingTransaction, onSaveTransaction,
    isRulesModalOpen, setIsRulesModalOpen, isQuickAddOpen, setIsQuickAddOpen,
  } = model;
  const [searchParams] = useSearchParams();
  const [isSettingsOpen, setIsSettingsOpen] = useState(() => searchParams.get('settings') === 'connections');

  useEffect(() => {
    if (!sectionFromPath(location.pathname)) navigate('/app/inicio', { replace: true });
  }, [location.pathname, navigate]);

  const activeFiltersCount = [categoryFilter, statusFilter, organizationFilter, typeFilter].filter(Boolean).length;
  const recentTransactions = useMemo(() => transactions.slice(0, 5), [transactions]);
  const selectSection = (section: AppSection) => {
    const target = APP_SECTIONS.find((item) => item.id === section);
    if (target) navigate(target.path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const periodToolbar = <PeriodToolbar currentPeriod={currentPeriod} onApplyPeriod={onApplyPeriod} currency={currency} setCurrency={setCurrency} />;

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r bg-card lg:flex">
        <div className="flex h-20 items-center gap-3 border-b px-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-lg font-black text-white shadow-md">b.</div>
          <div><p className="text-xl font-black tracking-tight">bills<span className="text-primary">.</span></p><p className="text-xs text-muted-foreground">Finanzas sin ruido</p></div>
        </div>
        <nav className="flex-1 space-y-1 p-4" aria-label="Navegación principal">
          {APP_SECTIONS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => selectSection(id)} aria-current={id === activeSection ? 'page' : undefined} className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors ${id === activeSection ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              <Icon className="h-5 w-5" />{label}
              {id === 'transactions' && activeFiltersCount > 0 && <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">{activeFiltersCount}</span>}
            </button>
          ))}
        </nav>
        <div className="border-t p-4">
          <Button onClick={() => setIsQuickAddOpen(true)} className="h-11 w-full gap-2 rounded-xl"><Plus className="h-4 w-4" />Nuevo movimiento</Button>
        </div>
      </aside>

      <Navbar title={SECTION_TITLES[activeSection]} hideBalances={hideBalances} setHideBalances={setHideBalances} onRefresh={onRefresh} onOpenSettings={() => setIsSettingsOpen(true)} refreshing={refreshing || refreshingStats} />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-5 pb-36 sm:px-6 sm:py-8 lg:ml-64 lg:pb-10">
        {activeSection === 'home' && (
          <>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><PageIntro title="Tu panorama" description="Lo importante de este período, sin sobrecargarte." />{periodToolbar}</div>
            {statsError && !stats ? (
              <Card><CardContent className="flex flex-col items-start gap-3 p-5"><p className="font-semibold">No pudimos cargar el resumen</p><p className="text-sm text-muted-foreground">Los movimientos no se han perdido. Puedes volver a intentarlo.</p><Button onClick={onRefresh}>Reintentar</Button></CardContent></Card>
            ) : loadingStats ? <LoadingCards /> : <MetricCards stats={stats} currency={currency} hideBalances={hideBalances} />}
            <Card className="overflow-hidden border-border/60 shadow-sm">
              <div className="flex items-center justify-between border-b p-4 sm:p-5"><div><h3 className="font-bold">Actividad reciente</h3><p className="text-xs text-muted-foreground">Tus últimos movimientos registrados</p></div><Button variant="ghost" onClick={() => selectSection('transactions')} className="min-h-11 text-primary">Ver todos</Button></div>
              <CardContent className="p-0">
                {loading ? <div className="space-y-2 p-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-14 animate-pulse rounded-xl bg-muted" />)}</div>
                  : recentTransactions.length === 0 ? <div className="flex flex-col items-center gap-2 p-10 text-center"><ReceiptText className="h-8 w-8 text-muted-foreground" /><p className="text-sm font-semibold">Aún no hay movimientos</p><Button onClick={() => setIsQuickAddOpen(true)} className="mt-2 min-h-11">Registrar el primero</Button></div>
                    : <div className="divide-y">{recentTransactions.map((transaction) => { const income = isReceivedTransfer(transaction); return <button key={transaction.id} type="button" onClick={() => setEditingTransaction(transaction)} className="flex min-h-[4.5rem] w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/50 sm:px-5"><div className="min-w-0"><p className="truncate text-sm font-semibold">{transaction.merchant}</p><p className="mt-1 truncate text-xs text-muted-foreground">{transaction.category || 'Otros'} · {formatDate(transaction.transactionDate)}</p></div><p className={`shrink-0 text-sm font-bold ${income ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>{hideBalances ? '••••••' : `${income ? '+ ' : ''}${formatCurrency(transaction.amount, transaction.currency)}`}</p></button>; })}</div>}
              </CardContent>
            </Card>
          </>
        )}

        {activeSection === 'transactions' && (
          <>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><PageIntro title="Todos tus movimientos" description="Busca, filtra y corrige desde un solo lugar." />{periodToolbar}</div>
            <TransactionTable transactions={transactions} total={totalTransactions} page={page} setPage={setPage} limit={limit} search={search} setSearch={setSearch} categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter} statusFilter={statusFilter} setStatusFilter={setStatusFilter} organizationFilter={organizationFilter} setOrganizationFilter={setOrganizationFilter} typeFilter={typeFilter} setTypeFilter={setTypeFilter} onResetFilters={onResetFilters} onEdit={setEditingTransaction} onExport={onExport} loading={loading} refreshing={refreshing} error={error instanceof Error ? error : null} onRetry={onRefresh} hideBalances={hideBalances} />
          </>
        )}

        {activeSection === 'analytics' && (
          <>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><PageIntro title="Entiende tus hábitos" description="Tendencias y categorías para tomar mejores decisiones." />{periodToolbar}</div>
            {statsError && !stats ? <Card><CardContent className="p-6 text-center"><p className="font-semibold">No pudimos preparar la analítica</p><Button onClick={onRefresh} className="mt-4">Reintentar</Button></CardContent></Card> : (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2"><React.Suspense fallback={<><div className="h-72 animate-pulse rounded-2xl bg-muted" /><div className="h-72 animate-pulse rounded-2xl bg-muted" /></>}><CategoryBreakdownChart stats={stats} currency={currency} /><DailySpendingChart stats={stats} currency={currency} /></React.Suspense></div>
            )}
          </>
        )}

        {activeSection === 'more' && (
          <>
            <PageIntro title="Control y preferencias" description="Las herramientas menos frecuentes viven aquí." />
            <div className="grid gap-3 sm:grid-cols-2">
              <Button variant="outline" onClick={() => setIsSettingsOpen(true)} className="h-auto min-h-20 justify-start gap-3 rounded-2xl p-4 text-left"><Settings className="h-5 w-5 text-primary" /><span><span className="block font-bold">Conexiones y privacidad</span><span className="mt-1 block text-xs font-normal text-muted-foreground">Gmail, exportación completa y tu cuenta</span></span></Button>
              <Button variant="outline" onClick={() => setIsRulesModalOpen(true)} className="h-auto min-h-20 justify-start gap-3 rounded-2xl p-4 text-left"><SlidersHorizontal className="h-5 w-5 text-amber-500" /><span><span className="block font-bold">Reglas de categorías</span><span className="mt-1 block text-xs font-normal text-muted-foreground">Automatiza cómo se organizan tus gastos</span></span></Button>
              <Button variant="outline" onClick={onExport} className="h-auto min-h-20 justify-start gap-3 rounded-2xl p-4 text-left"><Download className="h-5 w-5 text-sky-500" /><span><span className="block font-bold">Exportar movimientos</span><span className="mt-1 block text-xs font-normal text-muted-foreground">Descarga la vista actual en CSV</span></span></Button>
              <Button variant="outline" onClick={() => setDarkMode(!darkMode)} className="h-auto min-h-20 justify-start gap-3 rounded-2xl p-4 text-left">{darkMode ? <Sun className="h-5 w-5 text-amber-500" /> : <Moon className="h-5 w-5 text-indigo-500" />}<span><span className="block font-bold">{darkMode ? 'Usar tema claro' : 'Usar tema oscuro'}</span><span className="mt-1 block text-xs font-normal text-muted-foreground">Ajusta la apariencia a tu entorno</span></span></Button>
            </div>
            <Button variant="ghost" onClick={onLock} className="min-h-11 w-full gap-2 text-muted-foreground sm:w-auto"><Lock className="h-4 w-4" />Cerrar sesión</Button>
          </>
        )}
      </main>

      <BottomNav activeSection={activeSection} onSelectSection={selectSection} onQuickAdd={() => setIsQuickAddOpen(true)} activeFiltersCount={activeFiltersCount} />
      <QuickAddTransactionModal isOpen={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)} onSuccess={onRefresh} authToken={authToken} />
      <EditTransactionModal key={editingTransaction?.id ?? 'no-transaction'} transaction={editingTransaction} isOpen={Boolean(editingTransaction)} onClose={() => setEditingTransaction(null)} onSave={onSaveTransaction} />
      <RulesManagerModal isOpen={isRulesModalOpen} onClose={() => setIsRulesModalOpen(false)} authToken={authToken} />
      <AccountSettingsModal authToken={authToken} isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} onAccountDeleted={onAccountDeleted} />
    </div>
  );
};
