import React from 'react';
import type { PeriodSelection } from '@/entities/period';
import { Building2, Calendar, Coins, Filter } from 'lucide-react';
import { DatePickerField } from '@/shared/ui';
import { BANK_OPTIONS } from '../model/export-options';

interface ExportScopeFieldsProps {
  initialPeriod?: PeriodSelection;
  periodType: 'current' | 'all' | 'custom';
  setPeriodType: (type: 'current' | 'all' | 'custom') => void;
  customStartDate: string;
  setCustomStartDate: (val: string) => void;
  customEndDate: string;
  setCustomEndDate: (val: string) => void;
  currency: string;
  setCurrency: (val: string) => void;
  bank: string;
  setBank: (val: string) => void;
  category: string;
  setCategory: (val: string) => void;
}

export const ExportScopeFields: React.FC<ExportScopeFieldsProps> = ({
  initialPeriod,
  periodType,
  setPeriodType,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  currency,
  setCurrency,
  bank,
  setBank,
  category,
  setCategory,
}) => {
  return (
    <div className="space-y-3 rounded-2xl border border-border/70 bg-card/60 p-4">
      <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <Filter className="h-3.5 w-3.5" /> 1. Alcance y Filtros
      </h4>

      {/* Período */}
      <div>
        <label className="text-xs font-medium text-foreground flex items-center gap-1.5 mb-1.5">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          Período a exportar
        </label>
        <div className="grid grid-cols-3 gap-1.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setPeriodType('current')}
            className={`rounded-xl py-2 px-2 border transition-all ${
              periodType === 'current'
                ? 'border-primary bg-primary/10 text-primary shadow-sm'
                : 'border-border bg-background text-muted-foreground hover:text-foreground'
            }`}
          >
            {initialPeriod?.label || 'Mes actual'}
          </button>
          <button
            type="button"
            onClick={() => setPeriodType('all')}
            className={`rounded-xl py-2 px-2 border transition-all ${
              periodType === 'all'
                ? 'border-primary bg-primary/10 text-primary shadow-sm'
                : 'border-border bg-background text-muted-foreground hover:text-foreground'
            }`}
          >
            Todo el histórico
          </button>
          <button
            type="button"
            onClick={() => setPeriodType('custom')}
            className={`rounded-xl py-2 px-2 border transition-all ${
              periodType === 'custom'
                ? 'border-primary bg-primary/10 text-primary shadow-sm'
                : 'border-border bg-background text-muted-foreground hover:text-foreground'
            }`}
          >
            Personalizado
          </button>
        </div>

        {periodType === 'custom' && (
          <div className="mt-2.5">
            <DatePickerField
              mode="range"
              value={{ from: customStartDate, to: customEndDate }}
              onChange={(range) => {
                setCustomStartDate(range.from);
                setCustomEndDate(range.to);
              }}
              triggerLabel="Seleccionar fechas personalizadas"
              className="w-full"
            />
          </div>
        )}
      </div>

      {/* Moneda y Banco */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div>
          <label className="text-xs font-medium text-foreground flex items-center gap-1.5 mb-1.5">
            <Coins className="h-3.5 w-3.5 text-muted-foreground" />
            Moneda
          </label>
          <div className="flex rounded-xl border border-border bg-background p-1 text-xs font-bold">
            {['DOP', 'USD'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                className={`flex-1 rounded-lg py-1.5 transition-colors ${
                  currency === c
                    ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-foreground flex items-center gap-1.5 mb-1.5">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            Banco
          </label>
          <select
            value={bank}
            onChange={(e) => setBank(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium"
          >
            {BANK_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="pt-1">
        <label className="text-xs font-medium text-foreground flex items-center gap-1.5 mb-1.5">
          Categoría (Opcional)
        </label>
        <input
          type="text"
          placeholder="Ej. Supermercados, Restaurantes, Servicios..."
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs"
        />
      </div>
    </div>
  );
};
