import React from 'react';
import { ArrowDownRight, ArrowUpRight, CalendarRange, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/shared/ui';
import { formatCurrency } from '@/shared/lib';
import type { StatsSummary } from '@/entities/stat';
import type { SpendingInsightDto } from '@bills/contracts';

import { formatPeriodDay } from '../lib/format-period';

const toneStyles: Record<SpendingInsightDto['tone'], string> = {
  positive: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  warning: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
  neutral: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20',
};

const toneIcon = (tone: SpendingInsightDto['tone']) => {
  if (tone === 'positive') return <TrendingDown className="h-4 w-4" />;
  if (tone === 'warning') return <TrendingUp className="h-4 w-4" />;
  return <Minus className="h-4 w-4" />;
};

interface MonthPerspectiveCardProps {
  stats: StatsSummary | null;
  currency: string;
  hideBalances?: boolean;
}

export const MonthPerspectiveCard: React.FC<MonthPerspectiveCardProps> = ({ stats, currency, hideBalances = false }) => {
  const comparison = stats?.comparison;
  if (!stats || !comparison) return null;
  const change = comparison.expenseChangePercent;
  const changeAmount = comparison.expenseChangeAmount;
  const insights = stats.insights ?? [];
  const amount = (value: number) => (hideBalances ? '••••••' : formatCurrency(Math.abs(value), currency));

  return (
    <Card className="overflow-hidden border-border/60 shadow-sm" aria-label="Tu mes en perspectiva">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-bold">Tu mes en perspectiva</h3>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarRange className="h-3.5 w-3.5" />
              {formatPeriodDay(comparison.currentPeriod.startDate)} – {formatPeriodDay(comparison.currentPeriod.endDate)} frente a {formatPeriodDay(comparison.previousPeriod.startDate)} – {formatPeriodDay(comparison.previousPeriod.endDate)}
            </p>
          </div>
          <div className="text-right">
            <p className={`text-lg font-extrabold tracking-tight ${changeAmount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {changeAmount > 0 ? '+' : changeAmount < 0 ? '-' : ''}{amount(changeAmount)}
            </p>
            {change === null ? (
              <p className="text-[11px] font-semibold text-muted-foreground">Sin base comparable</p>
            ) : (
              <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-bold ${change > 0 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                {change > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(change)}% vs período anterior
              </span>
            )}
          </div>
        </div>
        {insights.length > 0 && (
          <ul className="mt-4 space-y-2" aria-label="Recomendaciones">
            {insights.map((insight) => (
              <li key={insight.code} className={`flex items-start gap-3 rounded-xl border p-3 ${toneStyles[insight.tone]}`}>
                <span className="mt-0.5 shrink-0">{toneIcon(insight.tone)}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">{insight.title}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {hideBalances && insight.metric?.currency ? 'Activa la vista de montos para ver el detalle.' : insight.description}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
