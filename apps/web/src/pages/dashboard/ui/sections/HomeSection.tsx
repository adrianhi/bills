import React, { type ReactNode } from "react";
import type { InboxConnection } from "@/entities/connection";
import type { StatsSummary } from "@/entities/stat";
import type { Transaction } from "@/entities/transaction";
import { MetricCards } from "@/widgets/metric-summary";
import { MonthPerspectiveCard } from "@/widgets/spending-perspective";
import { Button, Card, CardContent, LoadingScreen } from "@/shared/ui";
import { ConnectionHealthCard } from "../ConnectionHealthCard";
import { RecentTransactionsCard } from "./RecentTransactionsCard";
import { CurrentBudgetCard } from "./CurrentBudgetCard";
import { CashFlowCard } from "@/widgets/cash-flow";
import { useSafeToSpend } from "@/entities/budget";
import { SafeToSpendDial } from "@/widgets/safe-to-spend";
import { useRecurringRadar, type RecurringBillDto } from "@/entities/recurring-bill";
import { RecurringEditorDialog, useManageRecurring } from "@/features/manage-recurring";
import { RecurringRadarCard } from "@/widgets/recurring-radar";
import { usePaydayRitual } from "@/entities/payday-ritual";
import { useCompletePaydayRitual } from "@/features/complete-payday-ritual";
import { PaydayRitualCard } from "@/widgets/payday-ritual";
import { useTrackProductView } from "@/features/track-engagement";
import {
  useProactiveFeed,
  useWeeklyCheckin,
  useCompleteWeeklyCheckin,
  useDismissProactiveAction,
} from "@/entities/proactive";
import { ProactiveFeedCard } from "@/widgets/proactive-feed";
import { QuickTriageDialog, type QuickTriageItem } from "@/features/quick-triage";
import { WeeklyCheckinDialog } from "@/features/weekly-checkin";
import { ExpenseSimulatorDialog } from "@/features/expense-simulator";
import { WeeklyDigestPreviewDialog } from "@/features/weekly-digest";
import { LoadingSummaryCards } from "./LoadingSummaryCards";

interface HomeSectionProps {
  periodToolbar: ReactNode;
  primaryConnection?: InboxConnection;
  connectionsLoading: boolean;
  connectionsFailed: boolean;
  onOpenConnections: () => void;
  stats: StatsSummary | null;
  statsError: unknown;
  loadingStats: boolean;
  currency: string;
  hideBalances: boolean;
  onRefresh: () => void;
  transactions: Transaction[];
  loadingTransactions: boolean;
  onViewAllTransactions: () => void;
  onSelectTransaction: (transaction: Transaction) => void;
  onAddManual: () => void;
  activeMonth?: string;
  onSyncConnection?: () => void;
  syncingConnection?: boolean;
  onOpenBudget: () => void;
  onOpenRecurring?: () => void;
}

export const HomeSection: React.FC<HomeSectionProps> = ({
  periodToolbar,
  primaryConnection,
  connectionsLoading,
  connectionsFailed,
  onOpenConnections,
  stats,
  statsError,
  loadingStats,
  currency,
  hideBalances,
  onRefresh,
  transactions,
  loadingTransactions,
  onViewAllTransactions,
  onSelectTransaction,
  onAddManual,
  activeMonth,
  onSyncConnection,
  syncingConnection,
  onOpenBudget,
  onOpenRecurring,
}) => {
  const safeToSpend = useSafeToSpend(currency === 'USD' ? 'USD' : 'DOP');
  const activeCurrency = currency === 'USD' ? 'USD' : 'DOP';
  const recurring = useRecurringRadar(activeCurrency);
  const recurringActions = useManageRecurring(activeCurrency);
  const paydayRitual = usePaydayRitual(activeCurrency);
  const completePaydayRitual = useCompletePaydayRitual(activeCurrency);
  const proactiveFeed = useProactiveFeed(activeCurrency);
  const dismissProactiveAction = useDismissProactiveAction(activeCurrency);
  const weeklyCheckin = useWeeklyCheckin(activeCurrency);
  const completeWeeklyCheckin = useCompleteWeeklyCheckin(activeCurrency);
  const [editingRecurring, setEditingRecurring] = React.useState<RecurringBillDto | null>(null);
  const [triageItems, setTriageItems] = React.useState<QuickTriageItem[]>([]);
  const [isTriageOpen, setIsTriageOpen] = React.useState(false);
  const [isWeeklyCheckinOpen, setIsWeeklyCheckinOpen] = React.useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = React.useState(false);
  const [isDigestOpen, setIsDigestOpen] = React.useState(false);
  useTrackProductView(safeToSpend.data ? {
    name: 'SAFE_TO_SPEND_VIEWED', contextKey: safeToSpend.data.date,
    properties: { currency: activeCurrency, status: safeToSpend.data.status },
  } : null);
  useTrackProductView(recurring.data?.analysisStatus === 'READY' ? {
    name: 'RECURRING_RADAR_VIEWED', contextKey: `${activeCurrency}:${recurring.data.generatedAt.slice(0, 10)}`,
    properties: { currency: activeCurrency, status: recurring.data.analysisStatus },
  } : null);
  useTrackProductView(paydayRitual.data?.status === 'OPEN' && paydayRitual.data.cycleKey ? {
    name: 'PAYDAY_RITUAL_VIEWED', contextKey: paydayRitual.data.cycleKey,
    properties: { currency: activeCurrency, status: paydayRitual.data.status },
  } : null);
  if ((loadingTransactions && transactions.length === 0) || (loadingStats && !stats)) {
    return <LoadingScreen message="Cargando tus finanzas..." description="Analizando tus movimientos más recientes" fullPage />;
  }

  return (
    <>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Tu panorama</h2>
          <p className="text-xs text-muted-foreground sm:text-sm">Lo importante de este período, sin sobrecargarte.</p>
        </div>
        {periodToolbar}
      </div>

      <ConnectionHealthCard
        connection={primaryConnection}
        loading={connectionsLoading}
        failed={connectionsFailed}
        onOpenConnections={onOpenConnections}
        onSync={onSyncConnection}
        syncing={syncingConnection}
      />

      <ProactiveFeedCard
        feed={proactiveFeed.data || null}
        loading={proactiveFeed.isLoading}
        onDismiss={(actionId) => dismissProactiveAction.mutate(actionId)}
        onNavigateBudget={onOpenBudget}
        onNavigateRecurring={onOpenRecurring || onOpenBudget}
        onQuickCategorize={(items) => { setTriageItems(items); setIsTriageOpen(true); }}
        onOpenWeeklyCheckin={() => setIsWeeklyCheckinOpen(true)}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
      />

      <SafeToSpendDial
        value={safeToSpend.data || null}
        loading={safeToSpend.isLoading}
        hideBalances={hideBalances}
        onManageBudget={onOpenBudget}
      />

      <RecurringRadarCard
        radar={recurring.data || null}
        loading={recurring.isLoading}
        hideBalances={hideBalances}
        onEdit={setEditingRecurring}
        onStatus={(bill, status) => recurringActions.update.mutate({ id: bill.id, input: { status } })}
        onAcknowledge={(alertId) => recurringActions.acknowledge.mutate(alertId)}
      />

      <PaydayRitualCard
        ritual={paydayRitual.data || null}
        loading={paydayRitual.isLoading}
        completing={completePaydayRitual.isPending}
        hideBalances={hideBalances}
        onComplete={(cycleKey) => completePaydayRitual.mutate(cycleKey)}
      />

      <RecurringEditorDialog
        key={editingRecurring?.id || 'closed-recurring-editor'}
        bill={editingRecurring}
        open={Boolean(editingRecurring)}
        saving={recurringActions.update.isPending}
        onOpenChange={(open) => { if (!open) setEditingRecurring(null); }}
        onSave={async (input) => {
          if (!editingRecurring) return;
          await recurringActions.update.mutateAsync({ id: editingRecurring.id, input });
          setEditingRecurring(null);
        }}
      />

      <QuickTriageDialog open={isTriageOpen} onOpenChange={setIsTriageOpen} items={triageItems} currency={activeCurrency} />

      <WeeklyCheckinDialog
        open={isWeeklyCheckinOpen}
        onOpenChange={setIsWeeklyCheckinOpen}
        checkin={weeklyCheckin.data || null}
        isCompleting={completeWeeklyCheckin.isPending}
        onOpenDigestPreview={() => setIsDigestOpen(true)}
        onComplete={async (weekKey) => {
          await completeWeeklyCheckin.mutateAsync(weekKey);
          setIsWeeklyCheckinOpen(false);
        }}
      />

      <ExpenseSimulatorDialog
        open={isSimulatorOpen}
        onOpenChange={setIsSimulatorOpen}
        currency={activeCurrency}
        onProceedToRecord={() => onAddManual()}
      />

      <WeeklyDigestPreviewDialog
        open={isDigestOpen}
        onOpenChange={setIsDigestOpen}
        currency={activeCurrency}
      />

      {statsError && !stats ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 p-5">
            <p className="font-semibold">No pudimos cargar el resumen</p>
            <p className="text-sm text-muted-foreground">Los movimientos no se han perdido. Puedes volver a intentarlo.</p>
            <Button onClick={onRefresh}>Reintentar</Button>
          </CardContent>
        </Card>
      ) : loadingStats ? (
        <LoadingSummaryCards />
      ) : (
        <MetricCards stats={stats} currency={currency} hideBalances={hideBalances} />
      )}

      {!loadingStats && (
        <MonthPerspectiveCard stats={stats} currency={currency} hideBalances={hideBalances} />
      )}

      <CashFlowCard currency={currency} hideBalances={hideBalances} activeMonth={activeMonth} />
      <CurrentBudgetCard currency={currency} hideBalances={hideBalances} />
      <RecentTransactionsCard
        transactions={transactions}
        loading={loadingTransactions}
        hideBalances={hideBalances}
        onViewAll={onViewAllTransactions}
        onSelectTransaction={onSelectTransaction}
        onOpenConnections={onOpenConnections}
        onAddManual={onAddManual}
      />
    </>
  );
};
