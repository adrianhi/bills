import type { Institution } from '@/entities/connection';
import type { PeriodSelection } from '@/entities/period';
import { Building2, Calendar, Check, Coins, Filter } from 'lucide-react';
import { COMMON_CATEGORIES } from '@/shared/config/financial-options';
import { formatDateLabel } from '@/shared/lib';
import { DatePickerField } from '@/shared/ui';
import { computePresetRange, type ExportPeriodType } from '../model/export-form';
import { currentReportDate } from '../model/export-options';

interface ExportScopeFieldsProps {
  initialPeriod?: PeriodSelection;
  periodType: ExportPeriodType;
  setPeriodType: (value: ExportPeriodType) => void;
  customStartDate: string; setCustomStartDate: (value: string) => void;
  customEndDate: string; setCustomEndDate: (value: string) => void;
  currency: string; setCurrency: (value: string) => void;
  institutions: Institution[]; institutionsLoading: boolean; institutionsFailed: boolean;
  institutionCodes: string[]; setInstitutionCodes: (values: string[]) => void;
  category: string; setCategory: (value: string) => void;
  status: string; setStatus: (value: string) => void;
  transactionType: string; setTransactionType: (value: string) => void;
  search?: string; setSearch?: (value: string) => void;
}

const selectClass = 'w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium';

export function ExportScopeFields(props: ExportScopeFieldsProps) {
  const toggleBank = (code: string) => props.setInstitutionCodes(
    props.institutionCodes.includes(code)
      ? props.institutionCodes.filter((item) => item !== code)
      : [...props.institutionCodes, code],
  );

  const handlePeriodType = (value: ExportPeriodType) => {
    props.setPeriodType(value);
    if (value === 'last3' || value === 'last6') {
      const range = computePresetRange(value);
      props.setCustomStartDate(range.startDate);
      props.setCustomEndDate(range.endDate);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border/70 bg-card/60 p-4">
      <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <Filter className="h-3.5 w-3.5" /> 1. Alcance y filtros
      </h4>

      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium"><Calendar className="h-3.5 w-3.5 text-muted-foreground" />Período a exportar</label>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 text-xs font-semibold">
          {([
            ['current', props.initialPeriod?.label || 'Mes actual'],
            ['last3', 'Últimos 3 meses - Comparativa MoM'],
            ['last6', 'Últimos 6 meses'],
            ['all', 'Todo el histórico'],
            ['custom', 'Personalizado'],
          ] as const).map(([value, label]) => (
            <button key={value} type="button" onClick={() => handlePeriodType(value)}
              className={`rounded-xl border px-2 py-2 transition-all text-center ${props.periodType === value ? 'border-primary bg-primary/10 text-primary shadow-sm font-bold' : 'border-border bg-background text-muted-foreground hover:text-foreground'} ${value === 'custom' ? 'col-span-2 sm:col-span-1' : ''}`}>
              {label}
            </button>
          ))}
        </div>
        {(props.periodType === 'last3' || props.periodType === 'last6') && (
          <p className="mt-2 text-xs text-muted-foreground">
            Rango:{' '}
            <span className="font-medium text-foreground">
              {formatDateLabel(computePresetRange(props.periodType).startDate, { day: 'numeric', month: 'short', year: 'numeric' })} — {formatDateLabel(computePresetRange(props.periodType).endDate, { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </p>
        )}
        {props.periodType === 'custom' && (
          <div className="mt-2.5">
            <DatePickerField mode="range" value={{ from: props.customStartDate, to: props.customEndDate }}
              maxDate={currentReportDate()}
              onChange={(range) => { props.setCustomStartDate(range.from); props.setCustomEndDate(range.to); }}
              triggerLabel="Seleccionar fechas personalizadas" className="w-full" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium"><Coins className="h-3.5 w-3.5 text-muted-foreground" />Moneda</label>
          <div className="flex rounded-xl border border-border bg-background p-1 text-xs font-bold">
            {['DOP', 'USD'].map((code) => (
              <button key={code} type="button" onClick={() => props.setCurrency(code)}
                className={`flex-1 rounded-lg py-1.5 ${props.currency === code ? 'bg-primary/10 text-primary ring-1 ring-primary/20' : 'text-muted-foreground'}`}>{code}</button>
            ))}
          </div>
        </div>
        <label className="text-xs font-medium">Estado
          <select value={props.status} onChange={(event) => props.setStatus(event.target.value)} className={`${selectClass} mt-1.5`}>
            <option value="">Todos</option><option value="APPROVED">Aprobadas</option><option value="DECLINED">Rechazadas</option>
            <option value="REVERSED">Reversadas</option><option value="PENDING">Pendientes</option>
          </select>
        </label>
      </div>

      <fieldset>
        <div className="mb-2 flex items-center justify-between">
          <legend className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            Bancos incluidos
          </legend>
          {props.institutionCodes.length > 0 && (
            <button
              type="button"
              onClick={() => props.setInstitutionCodes([])}
              className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
            >
              Seleccionar todos
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => props.setInstitutionCodes([])}
            className={`flex items-center gap-2 rounded-xl border p-2 text-left text-xs transition-all cursor-pointer ${
              props.institutionCodes.length === 0
                ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/20 shadow-sm font-semibold'
                : 'border-border bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            }`}
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border ${
                props.institutionCodes.length === 0
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-muted-foreground/30'
              }`}
            >
              {props.institutionCodes.length === 0 && <Check className="h-3 w-3" />}
            </span>
            <span className="truncate">Todos los bancos</span>
          </button>
          {props.institutions.map((institution) => {
            const isSelected = props.institutionCodes.includes(institution.code);
            return (
              <button
                key={institution.code}
                type="button"
                onClick={() => toggleBank(institution.code)}
                className={`flex items-center gap-2 rounded-xl border p-2 text-left text-xs transition-all cursor-pointer ${
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/20 shadow-sm font-semibold'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                }`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border ${
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground/30'
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                </span>
                <span className="truncate">{institution.displayName}</span>
              </button>
            );
          })}
        </div>
        {props.institutionsLoading && (
          <p className="mt-2 text-xs text-muted-foreground">Cargando bancos disponibles…</p>
        )}
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium">
          Categoría
          <select
            value={props.category}
            onChange={(event) => props.setCategory(event.target.value)}
            className={`${selectClass} mt-1.5`}
          >
            <option value="">Todas</option>
            {COMMON_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium">
          Tipo de movimiento
          <select
            value={props.transactionType}
            onChange={(event) => props.setTransactionType(event.target.value)}
            className={`${selectClass} mt-1.5`}
          >
            <option value="">Todos</option>
            <option value="compra">Compras</option>
            <option value="enviada">Transferencias enviadas</option>
            <option value="servicio">Pagos de servicios</option>
            <option value="retiro">Retiros</option>
          </select>
        </label>
      </div>
    </div>
  );
}
