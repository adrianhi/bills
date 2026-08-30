import { useId, useState, type ReactNode } from 'react';
import { DayPicker, type DateRange } from '@daypicker/react';
import { es } from 'date-fns/locale';
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn, formatDateLabel, fromDateValue, normalizeRange, toDateValue, type DateRangeValue } from '@/shared/lib';
import { Button } from './button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './dialog';

export interface DatePickerQuickAction {
  id: string;
  label: string;
  description?: string;
  onSelect: () => void;
}

interface CommonProps {
  label?: string;
  description?: string;
  error?: string;
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
  triggerLabel?: string;
  triggerDescription?: string;
  quickActions?: DatePickerQuickAction[];
  className?: string;
  icon?: ReactNode;
  tourId?: string;
}

interface SingleProps extends CommonProps {
  mode: 'single';
  value: string;
  onChange: (value: string) => void;
}

interface RangeProps extends CommonProps {
  mode: 'range';
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
}

export type DatePickerFieldProps = SingleProps | RangeProps;

const dayPickerClassNames = (mode: DatePickerFieldProps['mode']) => ({
  root: 'w-full',
  months: 'w-full',
  month: 'w-full',
  month_caption: 'sr-only',
  month_grid: 'mx-auto w-[308px] max-w-full border-separate border-spacing-x-0 border-spacing-y-1',
  weekdays: 'border-b border-border/50',
  weekday: 'h-9 text-center text-[10px] font-bold uppercase text-muted-foreground',
  week: 'h-11',
  day: 'relative h-11 w-11 p-0 text-center text-sm',
  day_button: 'relative mx-auto flex h-11 w-11 items-center justify-center rounded-full font-semibold transition-colors motion-reduce:transition-none hover:bg-primary/10 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
  today: '[&>button]:border [&>button]:border-primary/50 [&>button]:text-primary',
  outside: 'text-muted-foreground/35',
  disabled: 'pointer-events-none opacity-25',
  selected: mode === 'single' ? '[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:shadow-md' : '',
  range_start: '[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:shadow-md',
  range_middle: '[&>button]:text-primary [&>button]:after:absolute [&>button]:after:bottom-1 [&>button]:after:h-1 [&>button]:after:w-1 [&>button]:after:rounded-full [&>button]:after:bg-primary/60',
  range_end: '[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:shadow-md',
});

const monthNames = Array.from({ length: 12 }, (_, month) => new Intl.DateTimeFormat('es-DO', { month: 'long' }).format(new Date(2026, month, 1)));

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const clampMonth = (date: Date, firstMonth: Date, lastMonth: Date) => {
  const candidate = startOfMonth(date);
  if (candidate < firstMonth) return firstMonth;
  if (candidate > lastMonth) return lastMonth;
  return candidate;
};

export function DatePickerField(props: DatePickerFieldProps) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [singleDraft, setSingleDraft] = useState<Date>();
  const [rangeDraft, setRangeDraft] = useState<DateRange>();
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [calendarView, setCalendarView] = useState<'calendar' | 'months' | 'years'>('calendar');
  const minDate = fromDateValue(props.minDate);
  const maxDate = fromDateValue(props.maxDate);
  const navigationEnd = maxDate ?? new Date();
  const navigationStart = minDate ?? new Date(navigationEnd.getFullYear() - 20, 0, 1);
  const firstMonth = startOfMonth(navigationStart);
  const lastMonth = startOfMonth(navigationEnd);
  const availableYears = Array.from(
    { length: lastMonth.getFullYear() - firstMonth.getFullYear() + 1 },
    (_, index) => firstMonth.getFullYear() + index,
  );
  const disabledDates = [minDate ? { before: minDate } : null, maxDate ? { after: maxDate } : null].filter(Boolean) as Array<{ before: Date } | { after: Date }>;

  const openPicker = () => {
    const selectedDate = props.mode === 'single' ? fromDateValue(props.value) : fromDateValue(props.value.from);
    if (props.mode === 'single') {
      setSingleDraft(fromDateValue(props.value));
    } else {
      setRangeDraft({ from: fromDateValue(props.value.from), to: fromDateValue(props.value.to) });
    }
    setVisibleMonth(clampMonth(selectedDate ?? maxDate ?? new Date(), firstMonth, lastMonth));
    setCalendarView('calendar');
    setOpen(true);
  };
  const apply = () => {
    if (props.mode === 'single') {
      if (!singleDraft) return;
      props.onChange(toDateValue(singleDraft));
    } else {
      if (!rangeDraft?.from) return;
      const from = toDateValue(rangeDraft.from);
      props.onChange(normalizeRange({ from, to: toDateValue(rangeDraft.to ?? rangeDraft.from) }));
    }
    setOpen(false);
  };
  const triggerLabel = props.triggerLabel || (props.mode === 'single' ? formatDateLabel(props.value) : 'Seleccionar período');
  const triggerDescription = props.triggerDescription || (props.mode === 'range' && props.value.from
    ? `${formatDateLabel(props.value.from, { day: 'numeric', month: 'short' })} — ${formatDateLabel(props.value.to || props.value.from, { day: 'numeric', month: 'short' })}`
    : 'Toca para elegir una fecha');
  const previousMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
  const nextMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
  const canGoPrevious = previousMonth >= firstMonth;
  const canGoNext = nextMonth <= lastMonth;

  const selectMonth = (month: number) => {
    setVisibleMonth(clampMonth(new Date(visibleMonth.getFullYear(), month, 1), firstMonth, lastMonth));
    setCalendarView('calendar');
  };

  const selectYear = (year: number) => {
    setVisibleMonth(clampMonth(new Date(year, visibleMonth.getMonth(), 1), firstMonth, lastMonth));
    setCalendarView('calendar');
  };

  return (
    <div className={cn('space-y-1.5', props.className)} data-product-tour={props.tourId}>
      {props.label && <label className="text-xs font-semibold text-foreground">{props.label}</label>}
      <button
        type="button"
        disabled={props.disabled}
        onClick={openPicker}
        className={cn('group flex min-h-14 w-full items-center gap-3 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/[0.10] via-card to-card px-3 py-2 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md active:scale-[0.99] motion-reduce:transform-none motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50', props.error && 'border-destructive')}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_8px_20px_hsl(var(--primary)/0.25)]">{props.icon ?? <CalendarDays className="h-5 w-5" />}</span>
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold capitalize">{triggerLabel}</span><span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{triggerDescription}</span></span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-aria-expanded:rotate-180" />
      </button>
      {props.description && !props.error && <p className="text-[11px] text-muted-foreground">{props.description}</p>}
      {props.error && <p role="alert" className="text-[11px] font-medium text-destructive">{props.error}</p>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bottom-0 left-0 top-auto max-h-[94dvh] w-full max-w-none translate-x-0 translate-y-0 grid-cols-[minmax(0,1fr)] gap-0 overflow-x-hidden overflow-y-auto rounded-t-[2rem] border-x-0 border-b-0 p-0 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border">
          <DialogHeader className="border-b bg-gradient-to-br from-primary/[0.12] to-transparent p-5 pr-12 text-left">
            <DialogTitle id={titleId}>Elige {props.mode === 'range' ? 'un período' : 'una fecha'}</DialogTitle>
            <DialogDescription>{props.mode === 'range' ? 'Toca una fecha para un día o dos fechas para un rango.' : 'Selecciona el día que quieres usar.'}</DialogDescription>
          </DialogHeader>

          {props.quickActions && props.quickActions.length > 0 && (
            <div className="border-b px-3 py-3">
              <div className="flex snap-x gap-2 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Períodos rápidos">
                {props.quickActions.map((action) => (
                  <button key={action.id} type="button" onClick={() => { action.onSelect(); setOpen(false); }} className="min-h-11 shrink-0 snap-start rounded-full border bg-muted/40 px-4 text-xs font-bold transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary">
                    {action.label}{action.description && <span className="ml-1 font-normal text-muted-foreground">{action.description}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="min-w-0 overflow-hidden px-3 py-3 sm:px-5">
            <div className="mb-2 flex h-12 items-center justify-between gap-2" aria-label="Navegación del calendario">
              <button type="button" onClick={() => setVisibleMonth(previousMonth)} disabled={!canGoPrevious} aria-label="Mes anterior" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border bg-card text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 disabled:opacity-25">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex min-w-0 items-center justify-center gap-1.5">
                <button type="button" onClick={() => setCalendarView(calendarView === 'months' ? 'calendar' : 'months')} aria-expanded={calendarView === 'months'} className={cn('flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-extrabold capitalize transition-colors hover:bg-muted', calendarView === 'months' && 'bg-primary/10 text-primary')}>
                  {monthNames[visibleMonth.getMonth()]}<ChevronDown className={cn('h-3.5 w-3.5 transition-transform', calendarView === 'months' && 'rotate-180')} />
                </button>
                <button type="button" onClick={() => setCalendarView(calendarView === 'years' ? 'calendar' : 'years')} aria-expanded={calendarView === 'years'} className={cn('flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-extrabold transition-colors hover:bg-muted', calendarView === 'years' && 'bg-primary/10 text-primary')}>
                  {visibleMonth.getFullYear()}<ChevronDown className={cn('h-3.5 w-3.5 transition-transform', calendarView === 'years' && 'rotate-180')} />
                </button>
              </div>
              <button type="button" onClick={() => setVisibleMonth(nextMonth)} disabled={!canGoNext} aria-label="Mes siguiente" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border bg-card text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 disabled:opacity-25">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {calendarView === 'months' && (
              <div className="grid min-w-0 grid-cols-3 gap-2 py-2" role="group" aria-label={`Meses de ${visibleMonth.getFullYear()}`}>
                {monthNames.map((month, index) => {
                  const candidate = new Date(visibleMonth.getFullYear(), index, 1);
                  const unavailable = candidate < firstMonth || candidate > lastMonth;
                  return <button key={month} type="button" disabled={unavailable} onClick={() => selectMonth(index)} className={cn('min-h-12 min-w-0 truncate rounded-2xl border border-transparent bg-muted/40 px-2 text-sm font-bold capitalize transition-all hover:border-primary/30 hover:bg-primary/10 hover:text-primary disabled:opacity-25', index === visibleMonth.getMonth() && 'border-primary/30 bg-primary text-primary-foreground shadow-md hover:bg-primary hover:text-primary-foreground')}>{month}</button>;
                })}
              </div>
            )}

            {calendarView === 'years' && (
              <div className="grid min-w-0 grid-cols-5 gap-1.5 py-2" role="group" aria-label="Años disponibles">
                {availableYears.map((year) => <button key={year} type="button" onClick={() => selectYear(year)} className={cn('min-h-11 rounded-2xl border border-transparent bg-muted/40 text-sm font-bold transition-all hover:border-primary/30 hover:bg-primary/10 hover:text-primary', year === visibleMonth.getFullYear() && 'border-primary/30 bg-primary text-primary-foreground shadow-md hover:bg-primary hover:text-primary-foreground')}>{year}</button>)}
              </div>
            )}

            {calendarView === 'calendar' && (props.mode === 'single' ? (
              <DayPicker mode="single" selected={singleDraft} onSelect={setSingleDraft} locale={es} weekStartsOn={0} showOutsideDays disabled={disabledDates} month={visibleMonth} onMonthChange={(month) => setVisibleMonth(clampMonth(month, firstMonth, lastMonth))} startMonth={navigationStart} endMonth={navigationEnd} hideNavigation classNames={dayPickerClassNames('single')} autoFocus aria-labelledby={titleId} />
            ) : (
              <DayPicker mode="range" selected={rangeDraft} onSelect={setRangeDraft} locale={es} weekStartsOn={0} showOutsideDays disabled={disabledDates} month={visibleMonth} onMonthChange={(month) => setVisibleMonth(clampMonth(month, firstMonth, lastMonth))} startMonth={navigationStart} endMonth={navigationEnd} hideNavigation classNames={dayPickerClassNames('range')} autoFocus aria-labelledby={titleId} resetOnSelect />
            ))}
          </div>

          <div className="mx-4 grid grid-cols-2 gap-2 rounded-2xl border bg-muted/30 p-3 text-xs sm:mx-5">
            <div><span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Desde</span><span className="mt-1 block font-bold">{formatDateLabel(props.mode === 'single' ? (singleDraft ? toDateValue(singleDraft) : '') : (rangeDraft?.from ? toDateValue(rangeDraft.from) : '')) || 'Selecciona'}</span></div>
            <div><span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Hasta</span><span className="mt-1 block font-bold">{formatDateLabel(props.mode === 'single' ? (singleDraft ? toDateValue(singleDraft) : '') : (rangeDraft?.to ? toDateValue(rangeDraft.to) : rangeDraft?.from ? toDateValue(rangeDraft.from) : '')) || 'Selecciona'}</span></div>
          </div>

          <DialogFooter className="sticky bottom-0 mt-3 flex-row gap-2 border-t bg-background/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur sm:space-x-0 sm:pb-4">
            <Button type="button" variant="ghost" className="min-h-11 flex-1" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="button" className="min-h-11 flex-1 gap-2" onClick={apply} disabled={props.mode === 'single' ? !singleDraft : !rangeDraft?.from}><Check className="h-4 w-4" />Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
