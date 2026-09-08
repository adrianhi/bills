import {
  Calendar,
  CheckCircle2,
  Sparkles,
  Store,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import type { WeeklyCheckinDto } from '@bills/contracts';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui';
import { formatCurrency, formatDate } from '@/shared/lib';

export interface WeeklyCheckinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkin: WeeklyCheckinDto | null;
  isCompleting?: boolean;
  onComplete: (weekKey: string) => Promise<void> | void;
}

export function WeeklyCheckinDialog({
  open,
  onOpenChange,
  checkin,
  isCompleting,
  onComplete,
}: WeeklyCheckinDialogProps) {
  if (!checkin) return null;

  const isCompleted = checkin.status === 'COMPLETED';
  const topCategory = checkin.topCategory;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Ritual Semanal
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Calendar className="h-3 w-3" /> {checkin.startDate} al {checkin.endDate}
            </span>
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            Cierre y Brújula Semanal
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            30 segundos para evaluar tu ritmo, entender a dónde fue el dinero y llegar cómodo al corte.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-2">
          {/* Card 1: Ritmo de gasto */}
          <div className="rounded-xl border border-border/70 bg-card p-3.5 shadow-sm space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Ritmo de Gasto Semanal</span>
              {checkin.changePercent !== null && checkin.changePercent < 0 ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <TrendingDown className="h-3.5 w-3.5" />
                  {Math.abs(checkin.changePercent)}% vs sem. previa
                </span>
              ) : checkin.changePercent !== null && checkin.changePercent > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                  <TrendingUp className="h-3.5 w-3.5" />
                  +{checkin.changePercent}% vs sem. previa
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Ritmo sostenido</span>
              )}
            </div>
            <div className="text-2xl font-black text-foreground">
              {formatCurrency(checkin.totalSpentThisWeek, checkin.currency)}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Semana anterior:{' '}
              <strong className="text-foreground">
                {formatCurrency(checkin.totalSpentPreviousWeek, checkin.currency)}
              </strong>
            </p>
          </div>

          {/* Card 2: Categoría y comercio líder */}
          <div className="rounded-xl border border-border/70 bg-card p-3.5 shadow-sm space-y-2.5">
            <span className="text-xs font-medium text-muted-foreground">¿Dónde se fue el dinero?</span>
            {topCategory ? (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-foreground">{topCategory.name}</span>
                  <span className="text-muted-foreground">
                    {formatCurrency(topCategory.amount, checkin.currency)} ({topCategory.percentage}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(8, topCategory.percentage))}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Sin gastos registrados esta semana.</p>
            )}

            {checkin.topMerchant && (
              <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2 text-xs text-muted-foreground">
                <Store className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  Frecuente: <strong className="text-foreground">{checkin.topMerchant.name}</strong> (
                  {formatCurrency(checkin.topMerchant.amount, checkin.currency)})
                </span>
              </div>
            )}
          </div>

          {/* Card 3: Brújula para la quincena */}
          <div className="rounded-xl border border-border/70 bg-card p-3.5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">
                Brújula al próximo corte
              </span>
              <span className="font-semibold text-foreground">
                Faltan {checkin.daysToNextPayday} {checkin.daysToNextPayday === 1 ? 'día' : 'días'}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-primary/5 p-2.5 border border-primary/10">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-foreground">Margen diario sugerido:</span>
              </div>
              <span className="text-sm font-bold text-primary">
                {formatCurrency(checkin.estimatedDailyAllowance, checkin.currency)}/día
              </span>
            </div>
          </div>

          {/* Status feedback if already completed */}
          {isCompleted && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-2.5 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>
                Revisión completada para esta semana
                {checkin.completedAt ? ` el ${formatDate(checkin.completedAt)}` : ''}.
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {isCompleted ? (
            <Button className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
              Listo
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                className="w-full sm:w-auto text-xs"
                onClick={() => onOpenChange(false)}
              >
                Recordarme luego
              </Button>
              <Button
                className="w-full sm:w-auto"
                disabled={isCompleting}
                onClick={() => onComplete(checkin.weekKey)}
              >
                {isCompleting ? 'Guardando...' : 'Completar revisión de la semana'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
