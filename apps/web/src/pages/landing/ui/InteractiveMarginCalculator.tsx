import { useState } from 'react';
import { Calculator, Calendar, Sparkles } from 'lucide-react';

export function InteractiveMarginCalculator() {
  const [income, setIncome] = useState<number>(35000);
  const [fixedExpenses, setFixedExpenses] = useState<number>(18000);
  const [daysRemaining, setDaysRemaining] = useState<number>(10);

  const freeCash = Math.max(0, income - fixedExpenses);
  const safeDaily = daysRemaining > 0 ? Math.round(freeCash / daysRemaining) : 0;

  return (
    <div className="relative rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950 p-6 md:p-8 shadow-2xl shadow-emerald-950/20 backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Simulador de Margen Seguro</h3>
            <p className="text-xs text-slate-400">Prueba cómo calcula Cuadre tu día a día</p>
          </div>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
          En vivo
        </span>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-3">
        <div>
          <label className="text-xs font-medium text-slate-300">Sueldo neto quincenal</label>
          <div className="mt-1.5 relative">
            <span className="absolute left-3 top-2.5 text-xs text-slate-500">RD$</span>
            <input
              type="number"
              step="1000"
              min="0"
              value={income}
              onChange={(e) => setIncome(Number(e.target.value) || 0)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900/90 py-2 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-300">Compromisos fijos</label>
          <div className="mt-1.5 relative">
            <span className="absolute left-3 top-2.5 text-xs text-slate-500">RD$</span>
            <input
              type="number"
              step="1000"
              min="0"
              value={fixedExpenses}
              onChange={(e) => setFixedExpenses(Number(e.target.value) || 0)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900/90 py-2 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-300">Días para cobrar</label>
          <div className="mt-1.5 relative">
            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="number"
              min="1"
              max="31"
              value={daysRemaining}
              onChange={(e) => setDaysRemaining(Math.max(1, Number(e.target.value) || 1))}
              className="w-full rounded-xl border border-slate-700 bg-slate-900/90 py-2 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Puedes gastar hoy aproximadamente:</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                RD$ {safeDaily.toLocaleString('es-DO')}
              </span>
              <span className="text-xs text-slate-400">/ por día</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Dinero libre de la quincena: <strong className="text-slate-200">RD$ {freeCash.toLocaleString('es-DO')}</strong> (tras apartar compromisos).
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-emerald-300/90 bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20 shrink-0">
            <span>Ritmo saludable</span>
          </div>
        </div>
      </div>
    </div>
  );
}
