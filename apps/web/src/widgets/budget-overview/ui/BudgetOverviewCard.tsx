import { Target } from 'lucide-react';
import type { BudgetSummaryDto } from '@/entities/budget';
import { Button, Card, CardContent } from '@/shared/ui';
import { formatCurrency } from '@/shared/lib';
import { BudgetStatusBadge } from './BudgetStatusBadge';

export function BudgetOverviewCard(props: {
  summary: BudgetSummaryDto | null; loading?: boolean; hideBalances: boolean;
  onManage: () => void; compact?: boolean;
}) {
  if (props.loading) return <div className="h-40 animate-pulse rounded-2xl bg-muted" />;
  const global = props.summary?.global;
  return (
    <Card><CardContent className="p-5">
      <div data-product-tour="budget-overview" className="flex items-start justify-between gap-3">
        <div className="flex gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Target className="h-5 w-5" /></span><div><p className="font-bold">Presupuesto de {props.summary?.month || 'este mes'}</p><p className="text-xs text-muted-foreground">Tus límites de gasto, sin depender de ingresos.</p></div></div>
        {global && <BudgetStatusBadge status={global.status} />}
      </div>
      {!props.summary?.hasBudget ? <div className="mt-4 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Aún no has definido límites para este mes.</div>
        : global ? <div className="mt-4"><div className="flex items-end justify-between gap-3"><p className="text-xl font-black">{props.hideBalances ? '••••••' : formatCurrency(global.spent, props.summary.currency)}</p><p className="text-xs text-muted-foreground">de {props.hideBalances ? '••••••' : formatCurrency(global.limit, props.summary.currency)}</p></div><div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted"><div className={`h-full ${global.status === 'EXCEEDED' ? 'bg-destructive' : global.status === 'ON_TRACK' ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(global.percentUsed, 100)}%` }} /></div><p className="mt-2 text-xs text-muted-foreground">{global.percentUsed.toLocaleString('es-DO', { maximumFractionDigits: 1 })}% consumido · {props.hideBalances ? '••••••' : `${formatCurrency(global.remaining, props.summary.currency)} disponibles`}</p>{props.summary.totalPending > 0 && <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{props.hideBalances ? 'Hay movimientos pendientes sin descontar.' : `${formatCurrency(props.summary.totalPending, props.summary.currency)} pendientes, todavía sin descontar.`}</p>}</div>
          : <p className="mt-4 text-sm text-muted-foreground">Tienes {props.summary.categories.length} categorías con límites definidos.</p>}
      {!props.compact && props.summary?.alerts.slice(0, 3).map((alert) => <p key={alert.categoryKey || 'global'} className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">{alert.categoryLabel || 'Tu presupuesto global'}: {alert.status === 'EXCEEDED' ? 'superaste el límite' : alert.status === 'NEAR_LIMIT' ? 'está cerca del límite' : 'lleva un ritmo acelerado'}.</p>)}
      <Button variant="outline" onClick={props.onManage} className="mt-4 w-full">{props.summary?.hasBudget ? 'Gestionar límites' : 'Crear presupuesto'}</Button>
    </CardContent></Card>
  );
}
