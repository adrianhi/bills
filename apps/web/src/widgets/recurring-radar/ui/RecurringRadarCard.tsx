import { CalendarClock, Check, Pencil, X } from 'lucide-react';
import type { RecurringBillDto, RecurringRadarDto } from '@/entities/recurring-bill';
import { Button, Card, CardContent } from '@/shared/ui';
import { formatCurrency } from '@/shared/lib';

const cadence = { BIWEEKLY: 'quincenal', MONTHLY: 'mensual', ANNUAL: 'anual' } as const;

function BillRow(props: {
  bill: RecurringBillDto; hideBalances: boolean;
  onEdit: (bill: RecurringBillDto) => void;
  onStatus: (bill: RecurringBillDto, status: 'CONFIRMED' | 'PAUSED' | 'DISMISSED') => void;
  onAcknowledge: (alertId: string) => void;
}) {
  const bill = props.bill;
  return (
    <div className="rounded-xl border border-border/70 p-3">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-sm font-bold">{bill.displayName}</p><p className="text-xs text-muted-foreground">{cadence[bill.cadence]} · {bill.daysRemaining >= 0 ? `en ${bill.daysRemaining} días` : 'fecha esperada vencida'}</p></div>
        <p className="text-sm font-black">{props.hideBalances ? '••••••' : formatCurrency(bill.expectedAmount, bill.currency)}</p>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {bill.status === 'SUGGESTED' ? <>
          <Button size="sm" onClick={() => props.onStatus(bill, 'CONFIRMED')}><Check className="mr-1 h-3.5 w-3.5" />Confirmar</Button>
          <Button size="sm" variant="ghost" onClick={() => props.onStatus(bill, 'DISMISSED')}><X className="mr-1 h-3.5 w-3.5" />Descartar</Button>
        </> : bill.status === 'PAUSED' ? <>
          <Button size="sm" onClick={() => props.onStatus(bill, 'CONFIRMED')}>Reactivar</Button>
          <Button size="sm" variant="outline" onClick={() => props.onEdit(bill)}><Pencil className="mr-1 h-3.5 w-3.5" />Editar</Button>
        </> : <>
          <Button size="sm" variant="outline" onClick={() => props.onEdit(bill)}><Pencil className="mr-1 h-3.5 w-3.5" />Editar</Button>
          <Button size="sm" variant="ghost" onClick={() => props.onStatus(bill, 'PAUSED')}>Pausar</Button>
        </>}
      </div>
      {bill.alerts.map((alert) => <div key={alert.id} className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-amber-500/10 px-2 py-1 text-xs text-amber-700 dark:text-amber-300">
        <span>{alert.kind === 'PRICE_HIKE' ? 'Este cobro subió más de 5% frente a su promedio.' : 'No vimos este cobro en la fecha esperada.'}</span>
        <button type="button" className="font-bold underline" onClick={() => props.onAcknowledge(alert.id)}>Entendido</button>
      </div>)}
    </div>
  );
}

export function RecurringRadarCard(props: {
  radar: RecurringRadarDto | null; loading: boolean; hideBalances: boolean;
  onEdit: (bill: RecurringBillDto) => void;
  onStatus: (bill: RecurringBillDto, status: 'CONFIRMED' | 'PAUSED' | 'DISMISSED') => void;
  onAcknowledge: (alertId: string) => void;
}) {
  if (props.loading) return <div className="h-40 animate-pulse rounded-2xl bg-muted" />;
  const radar = props.radar;
  if (!radar || radar.analysisStatus !== 'READY') return <Card><CardContent className="p-5 text-sm text-muted-foreground">Analizando tus movimientos para encontrar cobros recurrentes…</CardContent></Card>;
  const bills = [...radar.attention, ...radar.suggestions, ...radar.upcoming, ...radar.paused]
    .filter((bill, index, all) => all.findIndex((item) => item.id === bill.id) === index).slice(0, 5);
  return (
    <Card className="border-border/60 shadow-sm"><CardContent className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-2"><CalendarClock className="mt-0.5 h-5 w-5 text-primary" /><div><h3 className="font-black">Radar de cobros</h3><p className="text-xs text-muted-foreground">Lo próximo y lo que requiere tu atención.</p></div></div>
        <p className="text-right text-xs text-muted-foreground">{radar.upcomingWindows.in7} en 7 días · {radar.upcomingWindows.in30} en 30<br/><strong className="text-foreground">{props.hideBalances ? '••••••' : formatCurrency(radar.fixedMonthlyBurden, radar.currency)} / mes</strong></p>
      </div>
      <div className="mt-4 grid gap-2">{bills.length ? bills.map((bill) => <BillRow key={bill.id} bill={bill} hideBalances={props.hideBalances} onEdit={props.onEdit} onStatus={props.onStatus} onAcknowledge={props.onAcknowledge} />) : <p className="rounded-xl border border-dashed p-3 text-center text-xs text-muted-foreground">Aún no encontramos patrones suficientes.</p>}</div>
    </CardContent></Card>
  );
}
