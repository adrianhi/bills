import { Calendar, CalendarDays, CalendarRange, Clock, Sparkles } from 'lucide-react';
import { currentMonth, daysAgo, readableDate, readableMonth, type PeriodPreset } from '../model/usePeriodFilterDialog';

const presets: Array<{ id: PeriodPreset; title: string; subtitle: () => string; icon: typeof Calendar }> = [
  { id: 'today', title: 'Hoy', subtitle: () => readableDate(daysAgo(0)), icon: Sparkles },
  { id: 'yesterday', title: 'Ayer', subtitle: () => readableDate(daysAgo(1)), icon: Clock },
  { id: '7d', title: 'Últimos 7 días', subtitle: () => 'Semana actual', icon: CalendarDays },
  { id: '30d', title: 'Últimos 30 días', subtitle: () => 'Mes móvil', icon: CalendarRange },
  { id: 'this_month', title: 'Este Mes', subtitle: () => readableMonth(currentMonth()), icon: Calendar },
  { id: 'last_month', title: 'Mes Anterior', subtitle: () => readableMonth(currentMonth(-1)), icon: Calendar },
];

export const PeriodPresetPanel = ({ onSelect }: { onSelect: (preset: PeriodPreset) => void }) => (
  <div className="grid grid-cols-2 gap-2.5">
    {presets.map(({ id, title, subtitle, icon: Icon }) => (
      <button key={id} type="button" onClick={() => onSelect(id)} className="group flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-3 text-left transition-all hover:border-emerald-500/30 hover:bg-emerald-500/10 active:scale-95">
        <div><div className="text-xs font-semibold group-hover:text-emerald-500">{title}</div><div className="text-[11px] text-muted-foreground">{subtitle()}</div></div><Icon className="h-4 w-4 text-emerald-500 opacity-70" />
      </button>
    ))}
    <button type="button" onClick={() => onSelect('all')} className="col-span-2 rounded-xl border border-border/60 bg-muted/20 p-2.5 text-xs font-semibold text-muted-foreground transition-all hover:bg-muted/60 hover:text-foreground active:scale-95">Ver Todo el Histórico de Movimientos</button>
  </div>
);
