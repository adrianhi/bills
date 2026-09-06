import { Gauge, Settings2 } from 'lucide-react';
import type { SafeToSpendDto } from '@/entities/budget';
import { Button, Card, CardContent } from '@/shared/ui';
import { formatCurrency } from '@/shared/lib';

const copy = {
  SURPLUS: 'Vas bien. Este es tu margen para hoy.',
  ADJUSTING: 'Tu plan se ajusta sin juicios para los días que quedan.',
  EXCEEDED: 'Tu presupuesto mensual ya se consumió.',
  UNSET: 'Define un presupuesto global para activar tu monto diario.',
} as const;

export function SafeToSpendDial(props: {
  value: SafeToSpendDto | null;
  loading: boolean;
  hideBalances: boolean;
  onManageBudget: () => void;
}) {
  if (props.loading) return <div className="h-64 animate-pulse rounded-3xl bg-muted" />;
  const value = props.value;
  if (!value || value.status === 'UNSET') return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card">
      <CardContent className="flex flex-col items-center p-6 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Gauge className="h-6 w-6" />
        </span>
        <h3 className="mt-3 text-lg font-black">Tu dinero libre diario</h3>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{copy.UNSET}</p>
        <Button className="mt-4 gap-2" onClick={props.onManageBudget}>
          <Settings2 className="h-4 w-4" /> Crear presupuesto
        </Button>
      </CardContent>
    </Card>
  );

  const percentage = value.dailyAllowance > 0
    ? Math.min(100, Math.round(value.todayAvailable / value.dailyAllowance * 100))
    : 0;
  const color = value.status === 'EXCEEDED' ? '#ef4444'
    : value.status === 'ADJUSTING' ? '#f59e0b' : '#10b981';
  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card shadow-sm">
      <CardContent className="flex flex-col items-center p-5 sm:p-7">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold"><Gauge className="h-4 w-4 text-primary" /> Dinero libre hoy</div>
          <span className="text-xs text-muted-foreground">{value.daysRemaining} días restantes</span>
        </div>
        <div
          className="mt-5 grid h-44 w-44 place-items-center rounded-full p-3 transition-all duration-500"
          style={{ background: `conic-gradient(${color} ${percentage}%, hsl(var(--muted)) ${percentage}% 100%)` }}
          role="meter"
          aria-label="Dinero disponible para hoy"
          aria-valuemin={0}
          aria-valuemax={value.dailyAllowance}
          aria-valuenow={value.todayAvailable}
        >
          <div className="grid h-full w-full place-items-center rounded-full bg-card text-center shadow-inner">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Puedes gastar</p>
              <p className="mt-1 text-2xl font-black tracking-tight">
                {props.hideBalances ? '••••••' : formatCurrency(value.todayAvailable, value.currency)}
              </p>
              <p className="text-xs text-muted-foreground">hoy según tu plan</p>
            </div>
          </div>
        </div>
        <p className="mt-4 text-center text-sm font-medium">{copy[value.status]}</p>
        {value.futureConfirmedCommitments > 0 && (
          <p className="mt-2 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
            {props.hideBalances ? 'Reservas próximas incluidas' : `${formatCurrency(value.futureConfirmedCommitments, value.currency)} reservados para cobros próximos`}
          </p>
        )}
        {value.status === 'ADJUSTING' && value.nextDailyAllowance > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Mañana: {props.hideBalances ? '••••••' : formatCurrency(value.nextDailyAllowance, value.currency)} por día.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
