import type { BudgetProgressDto } from '@/entities/budget';
import { formatCurrency } from '@/shared/lib';
import { BudgetStatusBadge } from './BudgetStatusBadge';
import {
  ShoppingCart,
  Utensils,
  Landmark,
  ArrowRightLeft,
  Car,
  Fuel,
  Zap,
  Tv,
  HeartPulse,
  ShoppingBag,
  Home,
  Shirt,
  Film,
  Laptop,
  Package,
} from 'lucide-react';

function getCategoryTheme(label?: string | null) {
  const n = (label || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (n.includes('super') || n.includes('comida') || n.includes('alimento')) {
    return { icon: ShoppingCart, color: 'text-emerald-500 bg-emerald-500/10' };
  }
  if (n.includes('restaurante') || n.includes('delivery') || n.includes('bar')) {
    return { icon: Utensils, color: 'text-orange-500 bg-orange-500/10' };
  }
  if (n.includes('combustible') || n.includes('gasolina')) {
    return { icon: Fuel, color: 'text-amber-500 bg-amber-500/10' };
  }
  if (n.includes('transporte') || n.includes('uber') || n.includes('taxi')) {
    return { icon: Car, color: 'text-indigo-500 bg-indigo-500/10' };
  }
  if (n.includes('servicio') && n.includes('financ')) {
    return { icon: Landmark, color: 'text-blue-500 bg-blue-500/10' };
  }
  if (n.includes('transferencia')) {
    return { icon: ArrowRightLeft, color: 'text-sky-500 bg-sky-500/10' };
  }
  if (n.includes('servicio') || n.includes('luz') || n.includes('agua') || n.includes('internet')) {
    return { icon: Zap, color: 'text-yellow-500 bg-yellow-500/10' };
  }
  if (n.includes('suscrip') || n.includes('stream') || n.includes('netflix')) {
    return { icon: Tv, color: 'text-purple-500 bg-purple-500/10' };
  }
  if (n.includes('salud') || n.includes('farmacia') || n.includes('medico')) {
    return { icon: HeartPulse, color: 'text-rose-500 bg-rose-500/10' };
  }
  if (n.includes('compra') || n.includes('tienda')) {
    return { icon: ShoppingBag, color: 'text-pink-500 bg-pink-500/10' };
  }
  if (n.includes('hogar') || n.includes('casa')) {
    return { icon: Home, color: 'text-teal-500 bg-teal-500/10' };
  }
  if (n.includes('ropa') || n.includes('moda')) {
    return { icon: Shirt, color: 'text-violet-500 bg-violet-500/10' };
  }
  if (n.includes('entretenimiento') || n.includes('cine')) {
    return { icon: Film, color: 'text-fuchsia-500 bg-fuchsia-500/10' };
  }
  if (n.includes('tecnolog') || n.includes('software')) {
    return { icon: Laptop, color: 'text-cyan-500 bg-cyan-500/10' };
  }
  return { icon: Package, color: 'text-muted-foreground bg-muted' };
}

export function BudgetProgressList(props: {
  items: BudgetProgressDto[];
  currency: string;
  hideBalances: boolean;
}) {
  if (!props.items.length) {
    return (
      <p className="rounded-2xl border border-dashed p-4 text-center text-sm text-muted-foreground">
        No hay límites por categoría para este mes.
      </p>
    );
  }

  const priority = { EXCEEDED: 4, PACE_WARNING: 3, NEAR_LIMIT: 2, ON_TRACK: 1 } as const;
  const sorted = [...props.items].sort(
    (a, b) => priority[b.status] - priority[a.status] || b.percentUsed - a.percentUsed
  );

  return (
    <div className="divide-y divide-border/60 rounded-2xl border border-border/60 bg-card/60 shadow-sm">
      {sorted.map((item) => {
        const { icon: Icon, color } = getCategoryTheme(item.categoryLabel);
        return (
          <div key={item.categoryKey || 'global'} className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${color}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <p className="truncate text-sm font-bold text-foreground">
                  {item.categoryLabel || 'Presupuesto global'}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono text-xs font-black text-foreground sm:text-sm">
                  {props.hideBalances ? '••••••' : formatCurrency(item.spent, props.currency)}
                  <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                    / {props.hideBalances ? '••••••' : formatCurrency(item.limit, props.currency)}
                  </span>
                </p>
              </div>
            </div>

            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  item.status === 'EXCEEDED'
                    ? 'bg-destructive'
                    : item.status === 'ON_TRACK'
                      ? 'bg-emerald-500'
                      : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(item.percentUsed, 100)}%` }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                {item.percentUsed.toLocaleString('es-DO', { maximumFractionDigits: 1 })}% usado
                {' · '}
                {props.hideBalances
                  ? '••••••'
                  : `${formatCurrency(item.remaining, props.currency)} disp.`}
              </span>
              <BudgetStatusBadge status={item.status} />
            </div>

            {item.pending > 0 && (
              <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                {props.hideBalances
                  ? 'Hay movimientos pendientes.'
                  : `${formatCurrency(item.pending, props.currency)} pendientes sin descontar.`}
              </p>
            )}
            {item.projected !== null && item.status === 'PACE_WARNING' && (
              <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                Proyección estimada:{' '}
                {props.hideBalances ? '••••••' : formatCurrency(item.projected, props.currency)}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
