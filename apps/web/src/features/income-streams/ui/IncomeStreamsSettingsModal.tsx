import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Wallet } from 'lucide-react';
import type { CreateIncomeStreamInput, IncomeFrequency } from '@bills/contracts';
import { incomeKeys, incomeService } from '@/entities/income';
import { formatAmountInput, formatCurrency, parseAmountInput } from '@/shared/lib';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input } from '@/shared/ui';

interface IncomeStreamsSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
}

const FREQUENCIES: Array<{ id: IncomeFrequency; label: string; sub: string }> = [
  { id: 'BIWEEKLY_15_30', label: 'Quincenal (15 y 30)', sub: '2 pagos al mes' },
  { id: 'MONTHLY', label: 'Mensual', sub: '1 pago al mes' },
  { id: 'WEEKLY', label: 'Semanal', sub: '4 pagos al mes' },
];

export function IncomeStreamsSettingsModal({ open, onOpenChange, currency }: IncomeStreamsSettingsModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('Nómina Principal');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<IncomeFrequency>('BIWEEKLY_15_30');
  const [error, setError] = useState('');

  const { data: streams = [], isLoading } = useQuery({
    queryKey: incomeKeys.streams(),
    queryFn: ({ signal }) => incomeService.listStreams(signal),
    enabled: open,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: incomeKeys.all });
    queryClient.invalidateQueries({ queryKey: ['stats'] });
  };

  const createMutation = useMutation({
    mutationFn: (input: CreateIncomeStreamInput) => incomeService.createStream(input),
    onSuccess: () => {
      invalidate();
      setAmount('');
      setError('');
    },
    onError: (err: Error) => setError(err.message || 'Error al guardar fuente de ingreso'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => incomeService.deleteStream(id),
    onSuccess: () => invalidate(),
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = parseAmountInput(amount);
    const num = Number(raw);
    if (!name.trim()) { setError('Ingresa un nombre'); return; }
    if (!raw || isNaN(num) || num <= 0) { setError('Ingresa un monto válido mayor a 0'); return; }

    createMutation.mutate({
      name: name.trim(),
      amount: num,
      currency,
      frequency,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-5 w-5 text-emerald-500" />
            <span>Perfil de Ingresos Regulares</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Declara tu salario o ingresos recurrentes. Así bills. sabrá cuánto ganas y calculará tu ahorro real, incluso si tu banco no te alerta al cobrar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Form to add */}
          <form onSubmit={handleAdd} className="space-y-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 dark:bg-emerald-500/10">
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Añadir fuente de ingreso</p>
            {error && <p className="text-[11px] font-medium text-destructive">{error}</p>}
            <div className="space-y-2">
              <Input
                placeholder="Nombre (ej. Nómina, Freelance)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-xs"
              />
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs font-bold text-muted-foreground">{currency === 'DOP' ? 'RD$' : '$'}</span>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Monto por pago (ej. 45,000)"
                  value={amount}
                  onChange={(e) => setAmount(formatAmountInput(e.target.value))}
                  className="h-9 pl-10 text-xs font-semibold"
                />
              </div>
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {FREQUENCIES.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFrequency(f.id)}
                    className={`rounded-lg border p-1.5 text-center text-[10px] font-semibold transition-all ${frequency === f.id ? 'border-emerald-500 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'border-border/60 bg-background text-muted-foreground'}`}
                  >
                    <div className="truncate">{f.label}</div>
                    <div className="text-[9px] opacity-70">{f.sub}</div>
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" disabled={createMutation.isPending} size="sm" className="w-full h-8 gap-1 text-xs">
              <Plus className="h-3.5 w-3.5" />
              <span>{createMutation.isPending ? 'Guardando...' : 'Añadir a mi perfil'}</span>
            </Button>
          </form>

          {/* List of active streams */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Tus fuentes activas</p>
            {isLoading ? (
              <div className="h-16 animate-pulse rounded-xl bg-muted" />
            ) : streams.length === 0 ? (
              <p className="text-center py-4 text-xs text-muted-foreground">
                No tienes fuentes de ingreso declaradas aún.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {streams.map((stream) => (
                  <div key={stream.id} className="flex items-center justify-between rounded-lg border bg-card p-2.5 text-xs shadow-xs">
                    <div>
                      <p className="font-semibold text-foreground">{stream.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {stream.frequency === 'BIWEEKLY_15_30' ? 'Quincenal (15 y 30)' : stream.frequency === 'MONTHLY' ? 'Mensual' : 'Semanal'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(Number(stream.amount), stream.currency)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(stream.id)}
                        disabled={deleteMutation.isPending}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="w-full">
            Listo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
