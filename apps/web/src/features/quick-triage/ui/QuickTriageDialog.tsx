import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Sparkles, X } from 'lucide-react';
import { transactionService } from '@/entities/transaction';
import { proactiveKeys } from '@/entities/proactive';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui';
import { formatCurrency, formatDate } from '@/shared/lib';

export interface QuickTriageItem {
  id: string;
  merchant: string;
  amount: number;
  currency: string;
  transactionDate: string;
}

const TRIAGE_CATEGORIES = [
  { label: 'Supermercado', icon: '🛒' },
  { label: 'Restaurantes & Delivery', icon: '🍔' },
  { label: 'Servicios', icon: '⚡' },
  { label: 'Transporte', icon: '🚗' },
  { label: 'Combustible', icon: '⛽' },
  { label: 'Salud & Farmacia', icon: '💊' },
  { label: 'Compras Online', icon: '📦' },
  { label: 'Suscripciones', icon: '📱' },
  { label: 'Hogar', icon: '🏠' },
  { label: 'Entretenimiento', icon: '🎬' },
];

export function QuickTriageDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: QuickTriageItem[];
  currency: string;
}) {
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [completed, setCompleted] = useState(false);

  const currentItem = props.items[currentIndex];
  const remainingCount = props.items.length - currentIndex;

  const handleSelectCategory = async (category: string) => {
    if (!currentItem || isSaving) return;
    setIsSaving(true);
    try {
      await transactionService.update({
        id: currentItem.id,
        merchant: currentItem.merchant,
        category,
        notes: '',
      });

      if (currentIndex + 1 < props.items.length) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        setCompleted(true);
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: proactiveKeys.all });
        queryClient.invalidateQueries({ queryKey: ['budgets'] });
        queryClient.invalidateQueries({ queryKey: ['stats'] });
      }
    } catch {
      // Ignore or let user retry
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    if (currentIndex + 1 < props.items.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      props.onOpenChange(false);
    }
  };

  const handleClose = () => {
    props.onOpenChange(false);
    if (completed) {
      setCurrentIndex(0);
      setCompleted(false);
    }
  };

  return (
    <Dialog open={props.open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="text-left">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Clasificación 1-Tap
            </span>
            {!completed && props.items.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {remainingCount} {remainingCount === 1 ? 'pendiente' : 'pendientes'}
              </span>
            )}
          </div>
          <DialogTitle className="mt-2 text-lg font-bold">
            {completed ? '¡Todo al día!' : 'Asigna la categoría correcta'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {completed
              ? 'Has clasificado todos tus movimientos pendientes.'
              : 'Toca una categoría para clasificar el movimiento en 1 segundo.'}
          </DialogDescription>
        </DialogHeader>

        {completed ? (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h4 className="mt-4 font-bold">Movimientos clasificados</h4>
            <p className="mt-1 text-xs text-muted-foreground">
              Tus presupuestos y proyecciones se han actualizado automáticamente.
            </p>
            <Button className="mt-6 w-full" onClick={handleClose}>
              Cerrar y ver panorama
            </Button>
          </div>
        ) : currentItem ? (
          <div className="space-y-4">
            {/* Movement Highlight Card */}
            <div className="rounded-2xl border border-border/80 bg-muted/40 p-4 text-center sm:text-left">
              <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <p className="truncate text-base font-bold">{currentItem.merchant}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(currentItem.transactionDate)} · Registrado como "Otros"
                  </p>
                </div>
                <p className="shrink-0 text-lg font-black text-foreground">
                  {formatCurrency(currentItem.amount, currentItem.currency)}
                </p>
              </div>
            </div>

            {/* Fast 1-Tap Category Grid */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
              {TRIAGE_CATEGORIES.map((cat) => (
                <button
                  key={cat.label}
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSelectCategory(cat.label)}
                  className="flex min-h-[44px] items-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-2 text-left text-xs font-semibold transition hover:border-primary/50 hover:bg-primary/5 active:scale-95 disabled:opacity-50"
                >
                  <span className="text-base" role="img" aria-hidden="true">
                    {cat.icon}
                  </span>
                  <span className="truncate">{cat.label}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={handleSkip}
                disabled={isSaving}
              >
                Omitir este movimiento
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={handleClose}
              >
                <X className="mr-1 h-3.5 w-3.5" /> Dejar para luego
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No hay movimientos pendientes de clasificar.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
