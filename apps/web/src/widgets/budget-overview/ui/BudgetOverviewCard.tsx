import { Target } from 'lucide-react';
import type { BudgetSummaryDto } from '@/entities/budget';
import { Button, Card, CardContent } from '@/shared/ui';
import { formatCurrency, formatMonthLabel } from '@/shared/lib';
import { BudgetStatusBadge } from './BudgetStatusBadge';

export function BudgetOverviewCard(props: {
  summary: BudgetSummaryDto | null;
  loading?: boolean;
  hideBalances: boolean;
  onManage: () => void;
  compact?: boolean;
}) {
  if (props.loading) return <div className="h-32 animate-pulse rounded-2xl bg-muted" />;
  const global = props.summary?.global;
  const monthTitle = formatMonthLabel(props.summary?.month);

  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div data-product-tour="budget-overview" className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Target className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-bold sm:text-base">Presupuesto de {monthTitle}</p>
              {!props.compact && (
                <p className="text-xs text-muted-foreground">Tus límites de gasto, sin depender de ingresos.</p>
              )}
            </div>
          </div>
          {global && <BudgetStatusBadge status={global.status} />}
        </div>

        {!props.summary?.hasBudget ? (
          <div className="mt-3 rounded-xl border border-dashed p-3 text-center text-xs text-muted-foreground">
            Aún no has definido límites para {monthTitle}.
          </div>
        ) : global ? (
          <div className="mt-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-lg font-black tracking-tight sm:text-xl">
                {props.hideBalances ? '••••••' : formatCurrency(global.spent, props.summary.currency)}
              </p>
              <p className="text-xs text-muted-foreground">
                de {props.hideBalances ? '••••••' : formatCurrency(global.limit, props.summary.currency)}
              </p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full transition-all duration-300 ${
                  global.status === 'EXCEEDED'
                    ? 'bg-destructive'
                    : global.status === 'ON_TRACK'
                      ? 'bg-emerald-500'
                      : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(global.percentUsed, 100)}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{global.percentUsed.toLocaleString('es-DO', { maximumFractionDigits: 1 })}% consumido</span>
              <span>
                {props.hideBalances
                  ? '••••••'
                  : `${formatCurrency(global.remaining, props.summary.currency)} disponibles`}
              </span>
            </div>
            {props.summary.totalPending > 0 && (
              <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                {props.hideBalances
                  ? 'Hay movimientos pendientes sin descontar.'
                  : `${formatCurrency(props.summary.totalPending, props.summary.currency)} pendientes por aplicar.`}
              </p>
            )}
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            Tienes {props.summary.categories.length} categorías con límites definidos.
          </p>
        )}

        {!props.compact &&
          props.summary?.alerts.slice(0, 3).map((alert) => (
            <p
              key={alert.categoryKey || 'global'}
              className="mt-2 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-300"
            >
              {alert.categoryLabel || 'Tu presupuesto global'}:{' '}
              {alert.status === 'EXCEEDED'
                ? 'superaste el límite'
                : alert.status === 'NEAR_LIMIT'
                  ? 'está cerca del límite'
                  : 'lleva un ritmo acelerado'}
              .
            </p>
          ))}

        <Button
          variant="outline"
          size="sm"
          onClick={props.onManage}
          className="mt-3 h-9 w-full font-medium"
        >
          {props.summary?.hasBudget ? 'Gestionar límites' : 'Crear presupuesto'}
        </Button>
      </CardContent>
    </Card>
  );
}
