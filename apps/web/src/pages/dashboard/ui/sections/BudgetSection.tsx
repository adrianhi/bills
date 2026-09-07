import { useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layers, Lightbulb, RefreshCw, Repeat } from 'lucide-react';
import { currentBudgetMonth, useBudgetSummary } from '@/entities/budget';
import { useRecurringRadar, type RecurringBillDto } from '@/entities/recurring-bill';
import { BudgetManagerDialog } from '@/features/budget-manager';
import { RecurringCreatorDialog, RecurringEditorDialog, useManageRecurring } from '@/features/manage-recurring';
import { IncomeStreamsSettingsModal } from '@/features/income-streams';
import { BudgetOverviewCard, BudgetProgressList } from '@/widgets/budget-overview';
import { RecurringExpensesHub } from '@/widgets/recurring-radar';
import { formatCurrency } from '@/shared/lib';
import { Button, Card, CardContent, LoadingScreen } from '@/shared/ui';
import type { PeriodSelection } from '@/entities/period';

function getMonthFromSelection(selection?: PeriodSelection): string {
  if (selection?.month) return selection.month;
  if (selection?.startDate) return selection.startDate.slice(0, 7);
  return currentBudgetMonth();
}

export function BudgetSection(props: {
  periodToolbar: ReactNode;
  currentPeriod?: PeriodSelection;
  currency: string;
  hideBalances: boolean;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') === 'recurring' ? 'recurring' : 'categories';

  const [managerOpen, setManagerOpen] = useState(false);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringBillDto | null>(null);

  const month = getMonthFromSelection(props.currentPeriod);
  const currency = props.currency === 'USD' ? 'USD' : 'DOP';

  // Budget category query
  const query = useBudgetSummary(month, currency);
  const summary = query.data ?? null;

  // Recurring bills radar & mutations
  const recurringQuery = useRecurringRadar(currency);
  const recurringActions = useManageRecurring(currency);

  const setTab = (tab: 'categories' | 'recurring') => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === 'recurring') {
        next.set('tab', 'recurring');
      } else {
        next.delete('tab');
      }
      return next;
    }, { replace: true });
  };

  if (query.isLoading && !summary && currentTab === 'categories') {
    return (
      <LoadingScreen
        message="Cargando presupuesto…"
        description="Calculando tus límites y consumos del mes."
        fullPage
      />
    );
  }

  if (recurringQuery.isLoading && !recurringQuery.data && currentTab === 'recurring') {
    return (
      <LoadingScreen
        message="Cargando gastos fijos…"
        description="Calculando tus compromisos y suscripciones del mes."
        fullPage
      />
    );
  }

  return (
    <>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            {currentTab === 'recurring' ? 'Gastos Fijos y Suscripciones' : 'Planifica tus gastos'}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {currentTab === 'recurring'
              ? 'Conoce tu compromiso ineludible y cuánto dinero libre tienes para el mes.'
              : 'Define tus límites por categoría y revisa cuánto margen te queda.'}
          </p>
        </div>
        {props.periodToolbar}
      </div>

      {/* Primary Tab Switcher */}
      <div className="flex gap-2 border-b border-border/70 pb-1">
        <button
          type="button"
          onClick={() => setTab('categories')}
          className={`flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-bold transition-all ${
            currentTab === 'categories'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Límites por Categoría</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('recurring')}
          className={`flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-bold transition-all ${
            currentTab === 'recurring'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Repeat className="h-4 w-4" />
          <span>Gastos Fijos y Suscripciones</span>
          {recurringQuery.data?.allConfirmed && recurringQuery.data.allConfirmed.length > 0 && (
            <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-black text-primary">
              {recurringQuery.data.allConfirmed.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Categories / Variable Limits */}
      {currentTab === 'categories' && (
        <>
          {query.isError ? (
            <Card>
              <CardContent className="p-5">
                <p className="font-semibold">No pudimos cargar tu presupuesto</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tus límites guardados no se han perdido.
                </p>
                <Button onClick={() => void query.refetch()} className="mt-3 gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Reintentar
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <BudgetOverviewCard
                summary={summary}
                loading={query.isLoading}
                hideBalances={props.hideBalances}
                onManage={() => setManagerOpen(true)}
              />
              {summary?.hasBudget && (
                <Card className="border-border/60 shadow-sm">
                  <CardContent className="p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="font-bold">Límites por categoría</p>
                        <p className="text-xs text-muted-foreground">
                          Los pendientes se muestran sin consumir el límite.
                        </p>
                      </div>
                      <Lightbulb className="h-5 w-5 text-amber-500" />
                    </div>
                    <BudgetProgressList
                      items={summary.categories}
                      currency={currency}
                      hideBalances={props.hideBalances}
                    />
                    {summary.unbudgetedSpent > 0 && (
                      <div className="mt-4 rounded-xl bg-muted/60 p-3">
                        <p className="text-xs font-bold">Gasto en categorías sin límite</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {props.hideBalances ? '••••••' : formatCurrency(summary.unbudgetedSpent, currency)} · incluido en el límite global.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}

      {/* Tab 2: Recurring Bills & Subscriptions */}
      {currentTab === 'recurring' && (
        <RecurringExpensesHub
          radar={recurringQuery.data ?? null}
          loading={recurringQuery.isLoading}
          currency={currency}
          hideBalances={props.hideBalances}
          onOpenAddModal={() => setCreatorOpen(true)}
          onOpenIncomeModal={() => setIncomeModalOpen(true)}
          onEdit={setEditingRecurring}
          onStatus={(bill, status) => recurringActions.update.mutate({ id: bill.id, input: { status } })}
          onAcknowledgeAlert={(alertId) => recurringActions.acknowledge.mutate(alertId)}
        />
      )}

      {/* Dialogs */}
      <BudgetManagerDialog
        open={managerOpen}
        onOpenChange={setManagerOpen}
        month={month}
        currency={currency}
        summary={summary}
      />

      <RecurringCreatorDialog
        open={creatorOpen}
        currency={currency}
        saving={recurringActions.create.isPending}
        onOpenChange={setCreatorOpen}
        onSave={async (input) => {
          await recurringActions.create.mutateAsync(input);
          setCreatorOpen(false);
        }}
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

      <IncomeStreamsSettingsModal
        open={incomeModalOpen}
        onOpenChange={setIncomeModalOpen}
        currency={currency}
      />
    </>
  );
}
