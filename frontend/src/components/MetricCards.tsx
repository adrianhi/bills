import React from 'react';
import { 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  ShoppingBag, 
  CalendarDays, 
  Wallet
} from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { formatCurrency } from '@/lib/utils';
import type { StatsSummary } from '@/types';

interface MetricCardsProps {
  stats: StatsSummary | null;
  currency: string;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ stats, currency }) => {
  const topCategory = stats?.byCategory && stats.byCategory.length > 0
    ? stats.byCategory[0]
    : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      
      {/* 1. Gasto Total */}
      <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card to-card/50 shadow-sm hover:shadow-md transition-shadow">
        <div className="absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-primary/10 blur-2xl" />
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Gasto Total
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {stats ? formatCurrency(stats.totalAmount, currency) : 'RD$ 0.00'}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{stats?.totalTransactions || 0}</span>
              <span>transacciones registradas</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Aprobadas vs Rechazadas */}
      <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card to-card/50 shadow-sm hover:shadow-md transition-shadow">
        <div className="absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-emerald-500/10 blur-2xl" />
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Efectividad
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
                {stats?.approvedCount || 0}
              </div>
              <span className="text-xs text-muted-foreground">Transacciones Aprobadas</span>
            </div>
            {stats && stats.rejectedCount > 0 && (
              <div className="text-right">
                <div className="text-lg font-bold text-destructive flex items-center justify-end gap-1">
                  <XCircle className="h-3.5 w-3.5" />
                  {stats.rejectedCount}
                </div>
                <span className="text-[11px] text-muted-foreground">Rechazadas / Denegadas</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 3. Top Categoría */}
      <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card to-card/50 shadow-sm hover:shadow-md transition-shadow">
        <div className="absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-amber-500/10 blur-2xl" />
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Mayor Consumo
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-lg sm:text-xl font-bold tracking-tight truncate" title={topCategory?.category || 'Sin datos'}>
              {topCategory?.category || 'Sin datos'}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>{topCategory ? formatCurrency(topCategory.total, currency) : 'RD$ 0.00'}</span>
              {topCategory && (
                <span className="font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                  {topCategory.percentage}% del total
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Promedio Diario */}
      <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card to-card/50 shadow-sm hover:shadow-md transition-shadow">
        <div className="absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-blue-500/10 blur-2xl" />
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Promedio Diario
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <CalendarDays className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {stats ? formatCurrency(stats.dailyAverage || 0, currency) : 'RD$ 0.00'}
            </div>
            <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              <span>Gasto calculado por día activo</span>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
};
