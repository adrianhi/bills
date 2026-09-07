import { ArrowRight, CheckCircle2, Clock, Plus, ShieldCheck, Sparkles, Wallet } from 'lucide-react';
import type { RecurringRadarDto } from '@/entities/recurring-bill';
import { formatCurrency } from '@/shared/lib';
import { Button, Card, CardContent } from '@/shared/ui';

interface RecurringBurdenKpiCardProps {
  radar: RecurringRadarDto;
  hideBalances: boolean;
  currency: string;
  onOpenAddModal: () => void;
  onOpenIncomeModal: () => void;
}

export function RecurringBurdenKpiCard({
  radar,
  hideBalances,
  currency,
  onOpenAddModal,
  onOpenIncomeModal,
}: RecurringBurdenKpiCardProps) {
  const {
    fixedMonthlyBurden,
    paidThisMonth,
    pendingThisMonth,
    estimatedMonthlyIncome,
    freeDiscretionaryCash,
    allConfirmed,
  } = radar;

  const totalCount = allConfirmed.length;
  const paidPercent = fixedMonthlyBurden > 0
    ? Math.min(100, Math.round((paidThisMonth / fixedMonthlyBurden) * 100))
    : 0;

  return (
    <Card className="overflow-hidden border-border/60 bg-gradient-to-br from-card via-card to-emerald-500/[0.03] shadow-sm">
      <CardContent className="space-y-6 p-5 sm:p-6">
        {/* Header with Title & Action */}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground sm:text-lg">
                Compromiso Fijo Mensual
              </h3>
              <p className="text-xs text-muted-foreground">
                {totalCount === 1 ? '1 cobro ineludible' : `${totalCount} cobros ineludibles`} registrados para {currency}.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={onOpenAddModal}
            className="gap-1.5 self-start rounded-xl font-medium sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo gasto fijo</span>
          </Button>
        </div>

        {/* Big Numbers Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Total Monthly Fixed Burden */}
          <div className="rounded-2xl border border-border/50 bg-background/50 p-4 shadow-xs">
            <p className="text-xs font-medium text-muted-foreground">Total Comprometido</p>
            <p className="mt-1 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              {hideBalances ? '••••••' : formatCurrency(fixedMonthlyBurden, currency)}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Suscripciones y servicios base / mes
            </p>
          </div>

          {/* Paid this month */}
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] p-4 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Ya Pagado Este Mes</span>
            </div>
            <p className="mt-1 text-xl font-bold tracking-tight text-emerald-800 dark:text-emerald-300 sm:text-2xl">
              {hideBalances ? '••••••' : formatCurrency(paidThisMonth, currency)}
            </p>
            <p className="mt-1 text-[11px] text-emerald-600/80 dark:text-emerald-400/80">
              {paidPercent}% del compromiso cubierto
            </p>
          </div>

          {/* Pending this month */}
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] p-4 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
              <Clock className="h-3.5 w-3.5" />
              <span>Pendiente por Cobrar</span>
            </div>
            <p className="mt-1 text-xl font-bold tracking-tight text-amber-800 dark:text-amber-300 sm:text-2xl">
              {hideBalances ? '••••••' : formatCurrency(pendingThisMonth, currency)}
            </p>
            <p className="mt-1 text-[11px] text-amber-600/80 dark:text-amber-400/80">
              Saldrá de tu cuenta este mes
            </p>
          </div>
        </div>

        {/* Month Realization Progress Bar */}
        {fixedMonthlyBurden > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progreso de cobros del mes</span>
              <span className="font-semibold text-foreground">{paidPercent}% pagado</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                style={{ width: `${paidPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Free Discretionary Cash / Financial Peace of Mind Banner */}
        <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                {estimatedMonthlyIncome > 0 ? (
                  <>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-foreground">
                        Dinero Libre para Gastar y Ahorro:{' '}
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {hideBalances ? '••••••' : formatCurrency(freeDiscretionaryCash, currency)}
                        </span>
                      </p>
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                        Paz Mental
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      De tus ingresos ({hideBalances ? '••••••' : formatCurrency(estimatedMonthlyIncome, currency)}), tras reservar tus compromisos fijos.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-foreground">
                      Conoce tu Dinero Libre del mes
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Registra tu nómina o ingreso estimado para calcular cuánto te queda libre tras tus compromisos fijos.
                    </p>
                  </>
                )}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={onOpenIncomeModal}
              className="gap-1.5 rounded-xl text-xs font-medium"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>{estimatedMonthlyIncome > 0 ? 'Editar ingreso' : 'Configurar ingreso'}</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
