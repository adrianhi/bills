import { useState, type ReactNode } from 'react';
import { Lightbulb, RefreshCw } from 'lucide-react';
import { currentBudgetMonth, useBudgetSummary } from '@/entities/budget';
import { BudgetManagerDialog } from '@/features/budget-manager';
import { BudgetOverviewCard, BudgetProgressList } from '@/widgets/budget-overview';
import { formatCurrency } from '@/shared/lib';
import { Button, Card, CardContent } from '@/shared/ui';
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
  const [managerOpen, setManagerOpen] = useState(false);
  const month = getMonthFromSelection(props.currentPeriod);
  const currency = props.currency === 'USD' ? 'USD' : 'DOP';
  const query = useBudgetSummary(month, currency);
  const summary = query.data ?? null;

  return (
    <>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            Planifica tus gastos
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Define tus límites y revisa cuánto margen te queda.
          </p>
        </div>
        {props.periodToolbar}
      </div>

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

      <BudgetManagerDialog
        open={managerOpen}
        onOpenChange={setManagerOpen}
        month={month}
        currency={currency}
        summary={summary}
      />
    </>
  );
}
