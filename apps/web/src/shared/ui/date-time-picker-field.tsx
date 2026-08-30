import { Clock3 } from 'lucide-react';
import { currentLocalDateTime, toDateValue } from '@/shared/lib';
import { Button } from './button';
import { DatePickerField } from './date-picker-field';

interface DateTimePickerFieldProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  description?: string;
  error?: string;
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
}

export function DateTimePickerField({ value, onChange, label, description, error, disabled, minDate, maxDate }: DateTimePickerFieldProps) {
  const [date = '', time = '00:00'] = value.split('T');
  const today = toDateValue(new Date());
  const currentTime = currentLocalDateTime().split('T')[1];
  const timeMax = date === (maxDate ?? today) ? currentTime : undefined;
  const changeDate = (nextDate: string) => {
    const nextTime = nextDate === (maxDate ?? today) && time > currentTime ? currentTime : time;
    onChange(`${nextDate}T${nextTime}`);
  };
  const changeTime = (nextTime: string) => onChange(`${date || today}T${nextTime}`);

  return (
    <div className="space-y-2">
      <DatePickerField mode="single" value={date} onChange={changeDate} label={label} error={error} disabled={disabled} minDate={minDate} maxDate={maxDate} triggerLabel={formatTriggerDate(date)} triggerDescription="Toca para cambiar el día" />
      <div className="flex items-center gap-2">
        <label className="relative flex min-h-12 flex-1 items-center gap-2 rounded-xl border bg-background px-3 focus-within:ring-2 focus-within:ring-primary/50">
          <Clock3 className="h-4 w-4 text-primary" />
          <span className="sr-only">Hora</span>
          <input type="time" value={time} max={timeMax} disabled={disabled || !date} onChange={(event) => changeTime(event.target.value)} className="min-h-11 min-w-0 flex-1 bg-transparent text-sm font-bold outline-none disabled:opacity-50" />
        </label>
        <Button type="button" variant="outline" className="min-h-12 rounded-xl" disabled={disabled} onClick={() => onChange(currentLocalDateTime())}>Ahora</Button>
      </div>
      {description && !error && <p className="text-[11px] text-muted-foreground">{description}</p>}
    </div>
  );
}

function formatTriggerDate(value: string) {
  if (!value) return 'Seleccionar fecha';
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('es-DO', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(year, month - 1, day));
}
