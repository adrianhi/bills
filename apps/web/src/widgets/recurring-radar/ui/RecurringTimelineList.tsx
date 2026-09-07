import { useState } from 'react';
import { Calendar } from 'lucide-react';
import type { RecurringBillDto } from '@/entities/recurring-bill';
import { Card, CardContent } from '@/shared/ui';
import { RecurringBillRow } from './RecurringBillRow';

interface RecurringTimelineListProps {
  bills: RecurringBillDto[];
  hideBalances: boolean;
  onEdit: (bill: RecurringBillDto) => void;
  onStatus: (bill: RecurringBillDto, status: 'CONFIRMED' | 'PAUSED' | 'DISMISSED') => void;
  onAcknowledgeAlert: (alertId: string) => void;
}

export function RecurringTimelineList({
  bills,
  hideBalances,
  onEdit,
  onStatus,
  onAcknowledgeAlert,
}: RecurringTimelineListProps) {
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'PAID' | 'PAUSED'>('ALL');

  const filteredBills = bills.filter((b) => {
    if (filter === 'PAUSED') return b.status === 'PAUSED';
    if (b.status === 'PAUSED') return false;
    if (filter === 'PAID') return b.monthStatus === 'PAID';
    if (filter === 'PENDING') return b.monthStatus === 'UPCOMING' || b.monthStatus === 'OVERDUE';
    return true;
  });

  return (
    <Card className="border-border/60 shadow-xs">
      <CardContent className="space-y-4 p-5 sm:p-6">
        {/* Header and Filter Switcher */}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h4 className="text-base font-bold text-foreground">
              Tus Cobros y Suscripciones
            </h4>
            <p className="text-xs text-muted-foreground">
              Ordenados por próxima fecha de pago.
            </p>
          </div>

          <div className="flex flex-wrap gap-1 rounded-xl bg-muted/60 p-1">
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                filter === 'ALL'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Todos ({bills.filter((b) => b.status !== 'PAUSED').length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('PENDING')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                filter === 'PENDING'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Pendientes ({bills.filter((b) => b.status !== 'PAUSED' && b.monthStatus !== 'PAID').length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('PAID')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                filter === 'PAID'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Pagados ({bills.filter((b) => b.monthStatus === 'PAID').length})
            </button>
            {bills.some((b) => b.status === 'PAUSED') && (
              <button
                type="button"
                onClick={() => setFilter('PAUSED')}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  filter === 'PAUSED'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Pausados ({bills.filter((b) => b.status === 'PAUSED').length})
              </button>
            )}
          </div>
        </div>

        {/* List of bills */}
        {filteredBills.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 py-10 text-center">
            <Calendar className="h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm font-semibold text-muted-foreground">
              No hay cobros en este filtro
            </p>
            <p className="text-xs text-muted-foreground/80">
              {filter === 'PAID'
                ? 'Aún no hemos detectado cobros pagados este mes.'
                : filter === 'PENDING'
                ? '¡Excelente! No tienes cobros pendientes este mes.'
                : 'Registra tus cobros fijos para llevar un control automático.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {filteredBills.map((bill) => (
              <RecurringBillRow
                key={bill.id}
                bill={bill}
                hideBalances={hideBalances}
                onEdit={onEdit}
                onStatus={onStatus}
                onAcknowledgeAlert={onAcknowledgeAlert}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
