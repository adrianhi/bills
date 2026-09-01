import type { BudgetProgressDto } from '@/entities/budget';
import { formatCurrency } from '@/shared/lib';
import { BudgetStatusBadge } from './BudgetStatusBadge';

export function BudgetProgressList(props: { items: BudgetProgressDto[]; currency: string; hideBalances: boolean }) {
  if (!props.items.length) return <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">No hay límites por categoría para este mes.</p>;
  return (
    <div className="space-y-3">
      {props.items.map((item) => (
        <div key={item.categoryKey || 'global'} className="rounded-2xl border bg-background/70 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><p className="truncate text-sm font-bold">{item.categoryLabel || 'Presupuesto global'}</p><p className="mt-1 text-xs text-muted-foreground">{props.hideBalances ? '••••••' : `${formatCurrency(item.spent, props.currency)} de ${formatCurrency(item.limit, props.currency)}`}</p></div>
            <BudgetStatusBadge status={item.status} />
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${item.status === 'EXCEEDED' ? 'bg-destructive' : item.status === 'ON_TRACK' ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(item.percentUsed, 100)}%` }} /></div>
          <div className="mt-2 flex justify-between text-[11px] text-muted-foreground"><span>{item.percentUsed.toLocaleString('es-DO', { maximumFractionDigits: 1 })}% consumido</span><span>{props.hideBalances ? '••••••' : `${formatCurrency(item.remaining, props.currency)} disponibles`}</span></div>
          {item.pending > 0 && <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">{props.hideBalances ? 'Hay movimientos pendientes.' : `${formatCurrency(item.pending, props.currency)} pendientes, todavía sin descontar.`}</p>}
          {item.projected !== null && item.status === 'PACE_WARNING' && <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">Proyección estimada: {props.hideBalances ? '••••••' : formatCurrency(item.projected, props.currency)}</p>}
        </div>
      ))}
    </div>
  );
}
