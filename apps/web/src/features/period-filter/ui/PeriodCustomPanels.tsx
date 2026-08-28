import { ArrowRight, Calendar, Check } from 'lucide-react';
import { Button } from '@/shared/ui';
import { daysAgo, readableDate } from '../model/usePeriodFilterDialog';

const DateInput = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => (
  <div className="space-y-1.5"><label className="text-xs font-semibold text-muted-foreground">{label}</label><input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full cursor-pointer rounded-xl border border-input bg-background px-3 text-xs font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50" /></div>
);

export const SingleDayPanel = ({ value, onChange, onApply }: { value: string; onChange: (value: string) => void; onApply: () => void }) => (
  <div className="space-y-4 py-2">
    <DateInput label="Selecciona el día exacto:" value={value} onChange={onChange} />
    <div className="flex gap-2"><button type="button" onClick={() => onChange(daysAgo(0))} className="flex-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs font-medium hover:bg-muted">Hoy</button><button type="button" onClick={() => onChange(daysAgo(1))} className="flex-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs font-medium hover:bg-muted">Ayer</button></div>
    <Button type="button" onClick={onApply} className="h-11 w-full gap-2 font-semibold"><Check className="h-4 w-4" />Aplicar Filtro para el {readableDate(value)}</Button>
  </div>
);

export const DateRangePanel = ({ start, end, onStartChange, onEndChange, onApply }: { start: string; end: string; onStartChange: (value: string) => void; onEndChange: (value: string) => void; onApply: () => void }) => (
  <div className="space-y-4 py-2">
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><DateInput label="Desde (Fecha inicio)" value={start} onChange={onStartChange} /><DateInput label="Hasta (Fecha fin)" value={end} onChange={onEndChange} /></div>
    <div className="flex items-center justify-center gap-2 rounded-xl border border-border/40 bg-muted/30 p-3 text-xs"><span className="font-semibold">{readableDate(start)}</span><ArrowRight className="h-3.5 w-3.5 text-emerald-500" /><span className="font-semibold">{readableDate(end)}</span></div>
    <Button type="button" onClick={onApply} className="h-11 w-full gap-2 font-semibold"><Check className="h-4 w-4" />Aplicar Lapso de Fechas</Button>
  </div>
);

export const MonthsPanel = ({ months, selected, onSelect }: { months: Array<{ value: string; label: string }>; selected?: string; onSelect: (month: string) => void }) => (
  <div className="grid max-h-56 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
    {months.map((month) => <button key={month.value} type="button" onClick={() => onSelect(month.value)} className={`flex items-center justify-between rounded-xl border p-3 text-left text-xs font-semibold ${selected === month.value ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'border-border/60 bg-muted/30 hover:bg-muted/70'}`}><span>{month.label}</span>{selected === month.value && <Check className="h-4 w-4 text-emerald-500" />}</button>)}
  </div>
);

export const PeriodDialogTitle = () => <div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600"><Calendar className="h-4 w-4" /></div><div><div className="text-base font-bold">Filtrar por Período</div><p className="text-xs text-muted-foreground">Selecciona un día, lapso de fechas o mes</p></div></div>;
