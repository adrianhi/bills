import type { PeriodSelection } from '@/entities/period';
import { formatDateLabel, fromDateValue, toDateValue, type DateRangeValue } from '@/shared/lib';

export type PeriodPreset = 'today' | 'yesterday' | '7d' | '30d' | 'this_month' | 'last_month' | 'all';

export const daysAgo = (days: number, now = new Date()) => { const date = new Date(now); date.setDate(date.getDate() - days); return toDateValue(date); };
export const currentMonth = (offset = 0, now = new Date()) => { const date = new Date(now); date.setDate(1); date.setMonth(date.getMonth() + offset); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; };
export const readableDate = (value: string) => {
  return formatDateLabel(value, { day: 'numeric', month: 'short' });
};
export const readableMonth = (value: string) => {
  if (!value) return '';
  const [year, month] = value.split('-').map(Number);
  const label = new Date(year, month - 1, 1).toLocaleDateString('es-DO', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

export function selectionForPreset(preset: PeriodPreset, now = new Date()): PeriodSelection {
  const today = daysAgo(0, now);
  const yesterday = daysAgo(1, now);
  const options: Record<PeriodPreset, PeriodSelection> = {
    today: { startDate: today, endDate: today, label: `Hoy (${readableDate(today)})` },
    yesterday: { startDate: yesterday, endDate: yesterday, label: `Ayer (${readableDate(yesterday)})` },
    '7d': { startDate: daysAgo(6, now), endDate: today, label: 'Últimos 7 días' },
    '30d': { startDate: daysAgo(29, now), endDate: today, label: 'Últimos 30 días' },
    this_month: { month: currentMonth(0, now), label: readableMonth(currentMonth(0, now)) },
    last_month: { month: currentMonth(-1, now), label: readableMonth(currentMonth(-1, now)) },
    all: { label: 'Todo el histórico' },
  };
  return options[preset];
}

export function rangeForSelection(selection: PeriodSelection, now = new Date()): DateRangeValue {
  if (selection.startDate) return { from: selection.startDate, to: selection.endDate || selection.startDate };
  if (!selection.month) return { from: '', to: '' };
  const [year, month] = selection.month.split('-').map(Number);
  const from = toDateValue(new Date(year, month - 1, 1));
  const monthEnd = new Date(year, month, 0);
  const cappedEnd = monthEnd.getTime() > now.getTime() ? now : monthEnd;
  return { from, to: toDateValue(cappedEnd) };
}

export function periodDescription(selection: PeriodSelection) {
  if (selection.startDate) {
    return `${formatDateLabel(selection.startDate, { day: 'numeric', month: 'short', year: 'numeric' })} — ${formatDateLabel(selection.endDate || selection.startDate, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }
  if (selection.month) return `Mes completo · ${readableMonth(selection.month)}`;
  return 'Sin límite de fechas';
}

export const usePeriodFilterDialog = (onApply: (selection: PeriodSelection) => void) => {
  const applyPreset = (preset: PeriodPreset) => onApply(selectionForPreset(preset));
  const applyRange = (range: DateRangeValue) => {
    const from = fromDateValue(range.from);
    const to = fromDateValue(range.to || range.from);
    if (!from || !to) return;
    const [startDate, endDate] = range.from <= (range.to || range.from) ? [range.from, range.to || range.from] : [range.to || range.from, range.from];
    const singleDay = startDate === endDate;
    onApply({ startDate, endDate, label: singleDay ? formatDateLabel(startDate, { day: 'numeric', month: 'long', year: 'numeric' }) : `${readableDate(startDate)} — ${readableDate(endDate)}` });
  };
  return { applyPreset, applyRange };
};
