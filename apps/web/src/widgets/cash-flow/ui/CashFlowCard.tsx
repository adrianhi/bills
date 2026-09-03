import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, PiggyBank, Settings2, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { incomeKeys, incomeService } from '@/entities/income';
import { formatCurrency } from '@/shared/lib';
import { Button, Card, CardContent, CardHeader, CardTitle, CardOverlayLoader } from '@/shared/ui';
import { IncomeStreamsSettingsModal } from '@/features/income-streams';

interface CashFlowCardProps {
  currency: string;
  hideBalances: boolean;
  activeMonth?: string;
}

type HealthLevel = 'healthy' | 'caution' | 'deficit' | 'critical';

function deriveHealth(savingsRate: number, hasIncome: boolean): HealthLevel {
  if (!hasIncome) return 'healthy';
  if (savingsRate >= 20) return 'healthy';
  if (savingsRate >= 1) return 'caution';
  // deficit: spent > income; critical: spent > income * 1.5
  return savingsRate <= -50 ? 'critical' : 'deficit';
}

const HEALTH_STYLES: Record<HealthLevel, {
  border: string; metricsBg: string; barColor: string; barPulse: boolean;
  HeaderIcon: typeof PiggyBank; iconColor: string;
}> = {
  healthy: {
    border: 'border-emerald-500/30',
    metricsBg: 'bg-emerald-50/50 dark:bg-emerald-950/20',
    barColor: 'bg-emerald-500',
    barPulse: false,
    HeaderIcon: PiggyBank,
    iconColor: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
  },
  caution: {
    border: 'border-amber-500/30',
    metricsBg: 'bg-amber-50/40 dark:bg-amber-950/20',
    barColor: 'bg-amber-500',
    barPulse: false,
    HeaderIcon: AlertTriangle,
    iconColor: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
  },
  deficit: {
    border: 'border-rose-500/40',
    metricsBg: 'bg-rose-50/40 dark:bg-rose-950/20',
    barColor: 'bg-rose-500',
    barPulse: false,
    HeaderIcon: TrendingDown,
    iconColor: 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400',
  },
  critical: {
    border: 'border-rose-500/60',
    metricsBg: 'bg-rose-50/60 dark:bg-rose-950/30',
    barColor: 'bg-rose-500 animate-pulse',
    barPulse: true,
    HeaderIcon: TrendingDown,
    iconColor: 'bg-rose-500/15 text-rose-600 dark:bg-rose-500/25 dark:text-rose-400',
  },
};

function deficitMessage(netSavings: number, savingsRate: number, currency: string): string {
  if (savingsRate <= -50) return `⚠️ Déficit severo — gastaste más del doble de tu ingreso`;
  return `Gastaste ${formatCurrency(Math.abs(netSavings), currency)} más de lo que ganaste`;
}

export function CashFlowCard({ currency, hideBalances, activeMonth }: CashFlowCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const month = activeMonth || new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santo_Domingo',
    year: 'numeric',
    month: '2-digit',
  }).format(new Date()).slice(0, 7);

  const { data: cashFlow, isLoading, isFetching } = useQuery({
    queryKey: incomeKeys.cashFlow(month, currency),
    queryFn: ({ signal }) => incomeService.cashFlowSummary(month, currency, signal),
    placeholderData: (prev) => prev,
  });

  if (isLoading || !cashFlow) {
    return <div className="h-36 animate-pulse rounded-2xl bg-muted" />;
  }

  const mask = (val: number) => (hideBalances ? '••••••' : formatCurrency(val, currency));
  const hasIncome = cashFlow.totalIncome > 0;
  const isPositive = cashFlow.netSavings >= 0;
  const spentPercent = hasIncome ? Math.min(100, Math.round((cashFlow.totalSpent / cashFlow.totalIncome) * 100)) : 0;
  const savingsPercent = hasIncome ? Math.max(0, 100 - spentPercent) : 0;

  const health = deriveHealth(cashFlow.savingsRate, hasIncome);
  const style = HEALTH_STYLES[health];
  const { HeaderIcon } = style;
  const showOverlay = isFetching && !isLoading;

  return (
    <>
      <Card className={`overflow-hidden shadow-xs transition-colors duration-300 ${style.border}`}>
        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${style.iconColor}`}>
              <HeaderIcon className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold sm:text-base">Flujo de Caja del Mes</CardTitle>
              <p className="text-[11px] text-muted-foreground">Ingresos vs Gastos y Tasa de Ahorro</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Settings2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Configurar ingresos</span>
            <span className="sm:hidden">Ingresos</span>
          </Button>
        </CardHeader>

        <CardContent className="relative px-4 pb-4 pt-1 sm:px-6">
          <CardOverlayLoader visible={showOverlay} />

          {!hasIncome ? (
            <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-dashed border-border/80 bg-muted/20 p-4 sm:flex-row">
              <div className="space-y-1 text-center sm:text-left">
                <p className="text-xs font-semibold text-foreground flex items-center justify-center sm:justify-start gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                  <span>¿Aún no has declarado tus ingresos?</span>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Configura tu nómina o salario para conocer tu ahorro real y cuánto te queda para gastar.
                </p>
              </div>
              <Button size="sm" onClick={() => setIsModalOpen(true)} className="h-8 shrink-0 text-xs gap-1.5">
                <span>Declarar nómina</span>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* 3 Metrics Grid */}
              <div className={`grid grid-cols-3 gap-2 sm:gap-4 rounded-xl p-3 transition-colors duration-300 ${style.metricsBg}`}>
                {/* Ingresos */}
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                    <ArrowDownLeft className="h-3 w-3 text-emerald-500" />
                    <span>Ingresos</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {mask(cashFlow.totalIncome)}
                  </p>
                  <p className="text-[9px] text-muted-foreground truncate">
                    {cashFlow.streamsCount > 0 ? 'Nómina + detectados' : 'Bancos detectados'}
                  </p>
                </div>

                {/* Gastos */}
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                    <ArrowUpRight className="h-3 w-3 text-rose-500" />
                    <span>Gastos</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-foreground">
                    {mask(cashFlow.totalSpent)}
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    {spentPercent}% del ingreso
                  </p>
                </div>

                {/* Ahorro Neto / Déficit */}
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                    {isPositive
                      ? <TrendingUp className="h-3 w-3 text-emerald-500" />
                      : <TrendingDown className="h-3 w-3 text-rose-500" />}
                    <span>{isPositive ? 'Ahorro Neto' : 'Déficit'}</span>
                  </div>
                  <p className={`text-xs sm:text-sm font-bold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {mask(cashFlow.netSavings)}
                  </p>
                  <p className={`text-[9px] font-semibold ${isPositive ? 'text-muted-foreground' : 'text-rose-600/80 dark:text-rose-400/80'}`}>
                    {isPositive
                      ? `+${cashFlow.savingsRate}% tasa ahorro`
                      : deficitMessage(cashFlow.netSavings, cashFlow.savingsRate, currency)}
                  </p>
                </div>
              </div>

              {/* Proportional Balance Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-semibold text-muted-foreground">
                  <span>Gastos: {spentPercent}%</span>
                  <span className={isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                    {isPositive ? `Ahorro: ${savingsPercent}%` : 'Ahorro: 0%'}
                  </span>
                </div>
                <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    style={{ width: `${spentPercent}%` }}
                    className={`transition-all duration-500 ${isPositive ? 'bg-slate-400 dark:bg-slate-600' : style.barColor}`}
                  />
                  {isPositive && (
                    <div
                      style={{ width: `${savingsPercent}%` }}
                      className={`transition-all duration-500 ${style.barColor}`}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <IncomeStreamsSettingsModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        currency={currency}
      />
    </>
  );
}
