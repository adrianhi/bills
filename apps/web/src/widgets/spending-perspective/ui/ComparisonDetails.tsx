import React from 'react';
import { ArrowDownRight, ArrowUpRight, CalendarRange } from 'lucide-react';
import { Card, CardContent } from '@/shared/ui';
import { formatCurrency } from '@/shared/lib';
import type { StatsSummary } from '@/entities/stat';
import { formatPeriodDay } from '../lib/format-period';

interface FinancialDelta {
  name: string;
  currentTotal: number;
  previousTotal: number;
  changeAmount: number;
  changePercent: number | null;
}

interface ComparisonDetailsProps {
  stats: StatsSummary | null;
  currency: string;
  hideBalances?: boolean;
}

function DeltaList({ title, items, currency, hideBalances }: { title: string; items: FinancialDelta[]; currency: string; hideBalances: boolean }) {
  const amount = (value: number) => (hideBalances ? '••••••' : formatCurrency(value, currency));
  return (
    <div>
      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h4>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Sin movimientos en ninguno de los dos períodos.</p>
      ) : (
        <ul className="mt-2 divide-y" aria-label={title}>
          {items.map((item) => {
            const increased = item.changeAmount > 0;
            const unchanged = item.changeAmount === 0;
            return (
              <li key={item.name} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {hideBalances ? '••••••' : `${amount(item.previousTotal)} → ${amount(item.currentTotal)}`}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`flex items-center justify-end gap-0.5 text-sm font-bold ${unchanged ? 'text-muted-foreground' : increased ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {!unchanged && (increased ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />)}
                    {increased ? '+' : ''}{hideBalances ? '••••••' : formatCurrency(item.changeAmount, currency)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {item.changePercent === null ? 'Sin base comparable' : `${item.changePercent > 0 ? '+' : ''}${item.changePercent}%`}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export const ComparisonDetails: React.FC<ComparisonDetailsProps> = ({ stats, currency, hideBalances = false }) => {
  if (!stats) return null;
  const comparison = stats.comparison;
  if (!comparison) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <h3 className="font-bold">¿Qué explica el cambio?</h3>
          <p className="mt-1 text-sm text-muted-foreground">El histórico completo no tiene un período equivalente para comparar. Elige un mes o un rango de fechas.</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="border-border/60 shadow-sm" aria-label="Detalle de la comparación">
      <CardContent className="space-y-5 p-4 sm:p-5">
        <div>
          <h3 className="font-bold">¿Qué explica el cambio?</h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarRange className="h-3.5 w-3.5" />
            Período anterior: {formatPeriodDay(comparison.previousPeriod.startDate)} – {formatPeriodDay(comparison.previousPeriod.endDate)} ({comparison.previousPeriod.days} días)
          </p>
        </div>
        <DeltaList title="Categorías" items={comparison.categoryDeltas.slice(0, 6)} currency={currency} hideBalances={hideBalances} />
        <DeltaList title="Comercios" items={comparison.merchantDeltas.slice(0, 6)} currency={currency} hideBalances={hideBalances} />
      </CardContent>
    </Card>
  );
};
