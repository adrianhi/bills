import { CheckCircle2, Sparkles } from 'lucide-react';
import type { PaydayRitualDto } from '@/entities/payday-ritual';
import { Button, Card, CardContent } from '@/shared/ui';
import { formatCurrency } from '@/shared/lib';

export function PaydayRitualCard(props: {
  ritual: PaydayRitualDto | null;
  loading: boolean;
  completing: boolean;
  hideBalances: boolean;
  onComplete: (cycleKey: string) => void;
}) {
  if (props.loading) return <div className="h-32 animate-pulse rounded-2xl bg-muted" />;
  const ritual = props.ritual;
  if (!ritual?.eligible || ritual.status !== 'OPEN' || !ritual.cycleKey) return null;
  const money = (value: number) => props.hideBalances ? '••••••' : formatCurrency(value, ritual.currency);
  return (
    <Card className="overflow-hidden border-violet-400/30 bg-gradient-to-br from-violet-500/15 via-card to-primary/10 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-2.5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-300"><Sparkles className="h-5 w-5" /></span><div><p className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-300">Ritual de quincena</p><h3 className="text-lg font-black">Tu quincena está lista</h3></div></div>
          <span className="text-xs text-muted-foreground">{ritual.daysRemaining} días</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div><p className="text-xs text-muted-foreground">Ingreso planificado</p><p className="font-bold">{money(ritual.plannedIncome)}</p></div>
          <div><p className="text-xs text-muted-foreground">Gastos fijos</p><p className="font-bold">{money(ritual.paidFixed + ritual.futureFixed)}</p></div>
          <div><p className="text-xs text-muted-foreground">Otros gastos</p><p className="font-bold">{money(ritual.otherSpent)}</p></div>
          <div><p className="text-xs text-muted-foreground">Libre según tu plan</p><p className="font-black text-primary">{money(ritual.available)}</p></div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Tu guía diaria para el resto del ciclo es {money(ritual.dailyAvailable)}. No representa el saldo de tu banco.</p>
        {ritual.overage > 0 && <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">El plan supera el ingreso por {money(ritual.overage)}.</p>}
        <Button className="mt-4 w-full gap-2" disabled={props.completing} onClick={() => props.onComplete(ritual.cycleKey!)}><CheckCircle2 className="h-4 w-4" />{props.completing ? 'Guardando…' : 'Marcar quincena revisada'}</Button>
      </CardContent>
    </Card>
  );
}
