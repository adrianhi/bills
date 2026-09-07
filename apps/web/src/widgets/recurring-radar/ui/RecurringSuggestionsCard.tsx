import { Check, Sparkles, X } from 'lucide-react';
import type { RecurringBillDto } from '@/entities/recurring-bill';
import { formatCurrency } from '@/shared/lib';
import { Button, Card, CardContent } from '@/shared/ui';

interface RecurringSuggestionsCardProps {
  suggestions: RecurringBillDto[];
  hideBalances: boolean;
  onConfirm: (bill: RecurringBillDto) => void;
  onDismiss: (bill: RecurringBillDto) => void;
}

export function RecurringSuggestionsCard({
  suggestions,
  hideBalances,
  onConfirm,
  onDismiss,
}: RecurringSuggestionsCardProps) {
  if (suggestions.length === 0) return null;

  return (
    <Card className="overflow-hidden border-amber-500/30 bg-gradient-to-br from-amber-500/[0.04] to-card shadow-xs">
      <CardContent className="space-y-3 p-4 sm:p-5">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
          <Sparkles className="h-4 w-4" />
          <h4 className="text-sm font-bold">
            Cobros Recurrentes Detectados ({suggestions.length})
          </h4>
        </div>
        <p className="text-xs text-muted-foreground">
          Encontramos estos patrones repetitivos en tus movimientos bancarios. Confírmalos para sumarlos a tu compromiso mensual.
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          {suggestions.map((bill) => (
            <div
              key={bill.id}
              className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-background/80 p-3 shadow-2xs"
            >
              <div>
                <p className="text-xs font-bold text-foreground">{bill.displayName}</p>
                <p className="text-[11px] text-muted-foreground">
                  {bill.cadence === 'BIWEEKLY' ? 'Quincenal' : 'Mensual'} ·{' '}
                  <strong className="text-foreground">
                    {hideBalances ? '••••••' : formatCurrency(bill.expectedAmount, bill.currency)}
                  </strong>
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onConfirm(bill)}
                  className="h-8 gap-1 rounded-lg border-emerald-500/30 text-xs font-bold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                >
                  <Check className="h-3.5 w-3.5" />
                  Confirmar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDismiss(bill)}
                  className="h-8 w-8 rounded-lg p-0 text-muted-foreground hover:text-foreground"
                  title="Descartar"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
