import { useState } from 'react';
import { ArrowRight, Check, Loader2, Sparkles, Wallet } from 'lucide-react';
import type { IncomeFrequency } from '@bills/contracts';
import { formatCurrency } from '@/shared/lib';
import { Button, Card, CardContent, Input } from '@/shared/ui';

interface FinancialBaselineStepProps {
  busy: boolean;
  onFinish: (
    income?: { amount: number; frequency: IncomeFrequency },
    recurringServices?: Array<{ name: string; amount: number }>,
  ) => void;
  onSkip: () => void;
}

interface CommonService {
  id: string;
  name: string;
  category: string;
  defaultAmount: number;
}

const COMMON_RD_SERVICES: CommonService[] = [
  { id: 'telecom', name: 'Internet / Telecom (Claro/Altice)', category: 'Servicios', defaultAmount: 2200 },
  { id: 'electricity', name: 'Electricidad (Edeeste/Edesur)', category: 'Servicios', defaultAmount: 3500 },
  { id: 'streaming', name: 'Streaming (Netflix/Spotify)', category: 'Entretenimiento', defaultAmount: 1450 },
  { id: 'gym', name: 'Gimnasio (Smart Fit/Gym)', category: 'Salud', defaultAmount: 1790 },
  { id: 'home', name: 'Alquiler o Mantenimiento', category: 'Hogar', defaultAmount: 15000 },
];

export function FinancialBaselineStep({
  busy,
  onFinish,
  onSkip,
}: FinancialBaselineStepProps) {
  const [incomeAmount, setIncomeAmount] = useState('');
  const [frequency, setFrequency] = useState<IncomeFrequency>('BIWEEKLY_15_30');
  const [selectedServices, setSelectedServices] = useState<string[]>(['telecom', 'electricity', 'streaming']);

  const parsedIncome = Number(incomeAmount) || 0;
  const monthlyIncome = parsedIncome > 0
    ? frequency === 'BIWEEKLY_15_30'
      ? parsedIncome * 2
      : parsedIncome
    : 0;

  const estimatedFixedExpenses = COMMON_RD_SERVICES
    .filter((s) => selectedServices.includes(s.id))
    .reduce((sum, s) => sum + s.defaultAmount, 0);

  const discretionaryCash = Math.max(0, monthlyIncome - estimatedFixedExpenses);

  const toggleService = (id: string) => {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleComplete = () => {
    const incomeData = parsedIncome > 0 ? { amount: parsedIncome, frequency } : undefined;
    const recurringData = COMMON_RD_SERVICES
      .filter((s) => selectedServices.includes(s.id))
      .map((s) => ({ name: s.name, amount: s.defaultAmount }));

    onFinish(incomeData, recurringData);
  };

  return (
    <Card className="overflow-hidden border-border/60 shadow-xl">
      <div className="bg-gradient-to-br from-emerald-600 to-teal-600 p-6 text-white">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
          <Sparkles className="h-6 w-6" />
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-100">
          Paso 2 de 2 · Punto de Partida
        </p>
        <h1 className="mt-1 text-2xl font-bold">Tu tranquilidad financiera</h1>
        <p className="mt-2 max-w-lg text-sm text-emerald-50/90">
          Descubre cuánto dinero te queda libre cada mes antes de salir a la calle.
        </p>
      </div>

      <CardContent className="space-y-6 p-6">
        {/* Income Input */}
        <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">
              ¿Cuánto estimas que ingresas (neto)?
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Monto (DOP)
              <Input
                type="number"
                min="0"
                step="500"
                placeholder="Ej. 35,000"
                value={incomeAmount}
                onChange={(e) => setIncomeAmount(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Frecuencia de pago
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as IncomeFrequency)}
              >
                <option value="BIWEEKLY_15_30">Quincenal (15 y 30)</option>
                <option value="MONTHLY">Mensual (1 cobro/mes)</option>
                <option value="WEEKLY">Semanal</option>
              </select>
            </label>
          </div>
        </div>

        {/* Common Recurring Services */}
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Selecciona tus cobros fijos habituales
            </h3>
            <p className="text-xs text-muted-foreground">
              Bills los monitoreará automáticamente en tus movimientos.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {COMMON_RD_SERVICES.map((service) => {
              const selected = selectedServices.includes(service.id);
              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => toggleService(service.id)}
                  className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all ${
                    selected
                      ? 'border-emerald-500/50 bg-emerald-500/[0.06] shadow-xs'
                      : 'border-border/60 bg-background/50 hover:bg-muted/40'
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold text-foreground">{service.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Aprox. {formatCurrency(service.defaultAmount, 'DOP')} / mes
                    </p>
                  </div>
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-md border transition-all ${
                      selected
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-border bg-background'
                    }`}
                  >
                    {selected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Calculation Preview Card */}
        {monthlyIncome > 0 && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 text-center sm:text-left">
            <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              Tu cálculo preliminar para el mes:
            </p>
            <div className="mt-2 flex flex-col justify-between gap-2 sm:flex-row sm:items-baseline">
              <p className="text-xs text-muted-foreground">
                Ingreso: <strong className="text-foreground">{formatCurrency(monthlyIncome, 'DOP')}</strong> - Fijos:{' '}
                <strong className="text-foreground">{formatCurrency(estimatedFixedExpenses, 'DOP')}</strong>
              </p>
              <p className="text-base font-black text-emerald-700 dark:text-emerald-400 sm:text-lg">
                = {formatCurrency(discretionaryCash, 'DOP')} libres
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <Button
            className="min-h-12 w-full gap-2 text-base font-bold shadow-md shadow-emerald-500/20"
            disabled={busy}
            onClick={handleComplete}
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Preparando tu dashboard…</span>
              </>
            ) : (
              <>
                <span>Finalizar y entrar a Bills</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>

          <button
            type="button"
            className="w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
            disabled={busy}
            onClick={onSkip}
          >
            Omitir por ahora y configurar más tarde
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
