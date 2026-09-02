import type { Institution } from '@/entities/connection';
import type { PeriodSelection } from '@/entities/period';
import { Building2, Calendar, Coins, Filter, Search } from 'lucide-react';
import { COMMON_CATEGORIES } from '@/shared/config/financial-options';
import { DatePickerField } from '@/shared/ui';
import { currentReportDate, EXPORT_PERIOD_PRESETS, type ExportPeriodType } from '../model/export-options';

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
  search: string; setSearch: (value: string) => void;
}

const selectClass = 'w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium';

export function ExportScopeFields(props: ExportScopeFieldsProps) {
  const toggleBank = (code: string) => props.setInstitutionCodes(
    props.institutionCodes.includes(code)
      ? props.institutionCodes.filter((item) => item !== code)
      : [...props.institutionCodes, code],
  );
  return (
    <div className="space-y-4 rounded-2xl border border-border/70 bg-card/60 p-4">
      <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <Filter className="h-3.5 w-3.5" /> 1. Alcance y filtros
      </h4>

      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium"><Calendar className="h-3.5 w-3.5 text-muted-foreground" />Período a exportar</label>
        <div className="grid grid-cols-2 gap-1.5 text-xs font-semibold sm:grid-cols-3 md:grid-cols-5">
          {EXPORT_PERIOD_PRESETS.map(({ id, label }) => {
            const displayLabel = id === 'current' ? (props.initialPeriod?.label || label) : label;
            const isSelected = props.periodType === id
              || (id === '3m' && props.periodType === 'last_3_months')
              || (id === '6m' && props.periodType === 'last_6_months');
            return (
              <button
                key={id}
                type="button"
                onClick={() => props.setPeriodType(id)}
                className={`rounded-xl border px-2 py-2 text-center transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary shadow-sm font-bold'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                {displayLabel}
              </button>
            );
          })}
        </div>
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
        <legend className="mb-2 flex items-center gap-1.5 text-xs font-medium"><Building2 className="h-3.5 w-3.5 text-muted-foreground" />Bancos</legend>
        <div className="grid max-h-36 grid-cols-2 gap-1.5 overflow-y-auto rounded-xl border border-border bg-background p-2">
          <label className="col-span-2 flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-2 text-xs font-semibold hover:bg-muted/60">
            <input type="checkbox" checked={props.institutionCodes.length === 0} onChange={() => props.setInstitutionCodes([])} className="accent-emerald-600" />Todos los bancos
          </label>
          {props.institutions.map((institution) => (
            <label key={institution.code} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-2 text-xs hover:bg-muted/60">
              <input type="checkbox" checked={props.institutionCodes.includes(institution.code)} onChange={() => toggleBank(institution.code)} className="accent-emerald-600" />
              <span className="truncate">{institution.displayName}</span>
            </label>
          ))}
          {props.institutionsLoading && <span className="col-span-2 px-2 py-1 text-xs text-muted-foreground">Cargando bancos…</span>}
          {props.institutionsFailed && <span className="col-span-2 px-2 py-1 text-xs text-amber-600">No se cargó el catálogo completo. Todavía puedes exportar todos los bancos.</span>}
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium">Categoría
          <select value={props.category} onChange={(event) => props.setCategory(event.target.value)} className={`${selectClass} mt-1.5`}>
            <option value="">Todas</option>
            {COMMON_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium">Tipo de movimiento
          <select value={props.transactionType} onChange={(event) => props.setTransactionType(event.target.value)} className={`${selectClass} mt-1.5`}>
            <option value="">Todos</option><option value="compra">Compras</option><option value="enviada">Transferencias enviadas</option>
            <option value="servicio">Pagos de servicios</option><option value="retiro">Retiros</option>
          </select>
        </label>
      </div>
      <label className="block text-xs font-medium"><span className="flex items-center gap-1.5"><Search className="h-3.5 w-3.5 text-muted-foreground" />Búsqueda</span>
        <input value={props.search} onChange={(event) => props.setSearch(event.target.value)} placeholder="Comercio o nota" className={`${selectClass} mt-1.5`} />
      </label>
    </div>
  );
}
