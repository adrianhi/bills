import { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Plus,
  Sparkles,
  Wallet,
} from 'lucide-react';
import type { SimulateExpenseResultDto } from '@bills/contracts';
import { useSimulateExpense } from '@/entities/proactive';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@/shared/ui';
import { formatCurrency } from '@/shared/lib';

export interface ExpenseSimulatorCategory {
  key: string;
  label: string;
}

export interface ExpenseSimulatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
  categories?: ExpenseSimulatorCategory[];
  onProceedToRecord?: (expense: { amount: number; categoryKey?: string }) => void;
}

const QUICK_AMOUNTS = [500, 1500, 3000, 5000];

export function ExpenseSimulatorDialog({
  open,
  onOpenChange,
  currency,
  categories = [],
  onProceedToRecord,
}: ExpenseSimulatorDialogProps) {
  const [amountStr, setAmountStr] = useState('1500');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const simulateMutation = useSimulateExpense();
  const [result, setResult] = useState<SimulateExpenseResultDto | null>(null);

  const numericAmount = parseFloat(amountStr) || 0;
  const activeCurrency = currency === 'USD' ? 'USD' : 'DOP';

  useEffect(() => {
    if (!open) return;
    if (numericAmount <= 0) {
      setResult(null);
      return;
    }
    const timer = setTimeout(() => {
      simulateMutation.mutate(
        {
          amount: numericAmount,
          categoryKey: selectedCategory || undefined,
          currency: activeCurrency,
        },
        { onSuccess: (data) => setResult(data) }
      );
    }, 200);
    return () => clearTimeout(timer);
  }, [numericAmount, selectedCategory, activeCurrency, open]);

  const handleQuickAddAmount = (add: number) => {
    const next = (parseFloat(amountStr) || 0) + add;
    setAmountStr(String(next));
  };

  const isSafe = result?.verdict === 'SAFE';
  const isTight = result?.verdict === 'TIGHT';
  const isOverspend = result?.verdict === 'OVERSPEND';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary w-fit">
            <Sparkles className="h-3.5 w-3.5" /> Simulador Proactivo
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            ¿Puedo darme este gusto?
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Simula un gasto antes de pagar y descubre su impacto real en tu margen libre diario.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Monto input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">¿Cuánto piensas gastar?</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm font-bold text-muted-foreground">
                {activeCurrency}
              </span>
              <Input
                type="number"
                min="1"
                step="50"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0.00"
                className="pl-14 text-lg font-bold"
              />
            </div>
            {/* Quick chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleQuickAddAmount(amt)}
                  className="inline-flex items-center gap-0.5 rounded-lg border border-border/80 bg-muted/40 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition"
                >
                  <Plus className="h-3 w-3" />
                  {formatCurrency(amt, activeCurrency)}
                </button>
              ))}
            </div>
          </div>

          {/* Categoría opcional */}
          {categories.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Categoría (opcional)</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Cualquiera / Sin categoría específica</option>
                {categories.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Resultado de la simulación */}
          {result && (
            <div
              className={`rounded-xl border p-3.5 space-y-2.5 transition-all ${
                isSafe
                  ? 'border-emerald-500/40 bg-emerald-500/5'
                  : isTight
                  ? 'border-amber-500/40 bg-amber-500/5'
                  : 'border-rose-500/40 bg-rose-500/5'
              }`}
            >
              <div className="flex items-center gap-2">
                {isSafe && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
                {isTight && <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />}
                {isOverspend && <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />}
                <span
                  className={`text-xs font-bold ${
                    isSafe ? 'text-emerald-500' : isTight ? 'text-amber-500' : 'text-rose-500'
                  }`}
                >
                  {result.adviceTitle}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {result.adviceDescription}
              </p>

              {/* Comparativa de margen diario */}
              <div className="flex items-center justify-between rounded-lg bg-card/60 p-2.5 text-xs border border-border/50">
                <div className="flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Margen diario:</span>
                </div>
                <div className="flex items-center gap-1.5 font-bold">
                  <span className="text-muted-foreground line-through">
                    {formatCurrency(result.currentDailyAllowance, activeCurrency)}
                  </span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className={isOverspend ? 'text-rose-500' : 'text-foreground'}>
                    {formatCurrency(result.projectedDailyAllowance, activeCurrency)}/día
                  </span>
                </div>
              </div>

              {/* Impacto en categoría si existe */}
              {result.categoryImpact && (
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="font-medium text-muted-foreground">
                      Consumo en {result.categoryImpact.categoryLabel}:
                    </span>
                    <span className="font-semibold text-foreground">
                      {result.categoryImpact.projectedPercent}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${
                        result.categoryImpact.status === 'EXCEEDED'
                          ? 'bg-rose-500'
                          : result.categoryImpact.status === 'PACE_WARNING'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, result.categoryImpact.projectedPercent)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" className="text-xs" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          {numericAmount > 0 && onProceedToRecord && (
            <Button
              className="text-xs gap-1.5"
              onClick={() => {
                onProceedToRecord({ amount: numericAmount, categoryKey: selectedCategory });
                onOpenChange(false);
              }}
            >
              Registrar este gasto <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
