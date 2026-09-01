import React from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  ShoppingBag, 
  CalendarDays, 
  Wallet,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Card, CardContent } from '@/shared/ui';
import { formatCurrency } from '@/shared/lib';
import type { StatsSummary } from '@/entities/stat';

interface MetricCardsProps {
  stats: StatsSummary | null;
  currency: string;
  hideBalances?: boolean;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ stats, currency, hideBalances = false }) => {
  const topCategory = stats?.byCategory && stats.byCategory.length > 0
    ? stats.byCategory[0]
    : null;

  const expenseChange = stats?.comparison?.expenseChangePercent;

  const renderAmount = (amount: number) => {
    if (hideBalances) return '••••••';
    return formatCurrency(amount, currency);
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
      
      {/* 1. Gasto Total */}
      <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card via-card to-card/50 shadow-sm hover:shadow-md transition-all">
        <div className="absolute right-0 top-0 h-16 sm:h-24 w-16 sm:w-24 translate-x-4 -translate-y-4 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
        <CardContent className="p-3.5 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Gasto Total
            </span>
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-lg sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground truncate">
              {stats ? renderAmount(stats.totalAmount) : (hideBalances ? '••••••' : 'RD$ 0.00')}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] sm:text-xs text-muted-foreground">
              <span>{stats?.totalTransactions || 0} movs</span>
              
              {/* MoM Comparison Badge or Currency */}
              {expenseChange !== null && expenseChange !== undefined ? (
                <span className={`text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                  expenseChange > 0
                    ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20'
                    : 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                }`}>
                  {expenseChange > 0 ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {Math.abs(expenseChange)}% vs ant.
                </span>
              ) : (
                <span className="text-[10px] sm:text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  {currency}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Efectividad */}
      <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card via-card to-card/50 shadow-sm hover:shadow-md transition-all">
        <div className="absolute right-0 top-0 h-16 sm:h-24 w-16 sm:w-24 translate-x-4 -translate-y-4 rounded-full bg-sky-500/10 blur-2xl pointer-events-none" />
        <CardContent className="p-3.5 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground truncate">
              Aprobadas
            </span>
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-lg sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground truncate">
              {stats?.approvedCount || 0}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] sm:text-xs text-muted-foreground">
              <span>Exitosas</span>
              {stats && stats.rejectedCount > 0 && (
                <span className="text-destructive font-semibold flex items-center gap-0.5">
                  <XCircle className="h-3 w-3" /> {stats.rejectedCount}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Top Categoría */}
      <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card via-card to-card/50 shadow-sm hover:shadow-md transition-all">
        <div className="absolute right-0 top-0 h-16 sm:h-24 w-16 sm:w-24 translate-x-4 -translate-y-4 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />
        <CardContent className="p-3.5 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground truncate">
              Top Gasto
            </span>
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ShoppingBag className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-sm sm:text-lg font-bold tracking-tight truncate text-foreground" title={topCategory?.category || 'Sin datos'}>
              {topCategory?.category || 'Sin datos'}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] sm:text-xs text-muted-foreground">
              <span className="truncate">{topCategory ? renderAmount(topCategory.total) : 'RD$ 0.00'}</span>
              {topCategory && (
                <span className="font-bold text-[10px] sm:text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded ml-1">
                  {topCategory.percentage}%
                </span>
              )}
            </div>
            {topCategory && (
              <div className="mt-2 w-full bg-muted rounded-full h-1 sm:h-1.5 overflow-hidden">
                <div 
                  className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(topCategory.percentage, 100)}%` }}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 4. Ticket Promedio */}
      <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card via-card to-card/50 shadow-sm hover:shadow-md transition-all">
        <div className="absolute right-0 top-0 h-16 sm:h-24 w-16 sm:w-24 translate-x-4 -translate-y-4 rounded-full bg-purple-500/10 blur-2xl pointer-events-none" />
        <CardContent className="p-3.5 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground truncate">
              Ticket Prom.
            </span>
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-lg sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground truncate">
              {stats ? renderAmount(stats.averageTicket || 0) : (hideBalances ? '••••••' : 'RD$ 0.00')}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] sm:text-xs text-muted-foreground">
              <span>Por compra</span>
              <span className="text-[10px] sm:text-[11px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                Promedio
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
};
