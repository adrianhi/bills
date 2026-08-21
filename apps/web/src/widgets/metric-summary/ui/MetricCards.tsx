import React from 'react';
import { 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  ShoppingBag, 
  CalendarDays, 
  Wallet
} from 'lucide-react';
import { Card, CardContent } from '@/shared/ui';
import { formatCurrency } from '@/shared/lib';
import type { StatsSummary } from '@/entities/stat';

interface MetricCardsProps {
  stats: StatsSummary | null;
  currency: string;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ stats, currency }) => {
  const topCategory = stats?.byCategory && stats.byCategory.length > 0
    ? stats.byCategory[0]
    : null;

  const hasIncome = (stats?.totalIncome || 0) > 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      
      {/* 1. Gasto Total */}
      <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card via-card to-card/50 shadow-sm hover:shadow-md transition-all">
        <div className="absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Gasto Total
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {stats ? formatCurrency(stats.totalAmount, currency) : 'RD$ 0.00'}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>{stats?.totalTransactions || 0} movimientos</span>
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                {currency}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Ingresos o Efectividad */}
      <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card via-card to-card/50 shadow-sm hover:shadow-md transition-all">
        <div className="absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-sky-500/10 blur-2xl pointer-events-none" />
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {hasIncome ? 'Ingresos Recibidos' : 'Transacciones Aprobadas'}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              {hasIncome ? <TrendingUp className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            </div>
          </div>
          <div className="mt-3">
            {hasIncome ? (
              <>
                <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
                  + {formatCurrency(stats?.totalIncome || 0, currency)}
                </div>
                <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                  <span className="text-emerald-500 font-medium">{stats?.approvedCount || 0} aprobadas</span>
                  {stats && stats.rejectedCount > 0 && (
                    <span className="text-destructive">• {stats.rejectedCount} rech.</span>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  {stats?.approvedCount || 0}
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Operaciones exitosas</span>
                  {stats && stats.rejectedCount > 0 && (
                    <span className="text-destructive font-semibold flex items-center gap-0.5">
                      <XCircle className="h-3 w-3" /> {stats.rejectedCount} denegadas
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 3. Top Categoría */}
      <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card via-card to-card/50 shadow-sm hover:shadow-md transition-all">
        <div className="absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />
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
                  {topCategory.percentage}%
                </span>
              )}
            </div>
            {topCategory && (
              <div className="mt-2 w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, Math.max(5, topCategory.percentage))}%` }}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 4. Promedio Diario & Ticket Promedio */}
      <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card via-card to-card/50 shadow-sm hover:shadow-md transition-all">
        <div className="absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Promedio Diario
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <CalendarDays className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {stats ? formatCurrency(stats.dailyAverage || 0, currency) : 'RD$ 0.00'}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>Por día activo</span>
              {stats?.averageTicket ? (
                <span className="text-[11px] font-mono text-muted-foreground">
                  ~{formatCurrency(stats.averageTicket, currency)}/op
                </span>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
};
