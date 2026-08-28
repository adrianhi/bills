import { useMemo, useState } from 'react';
import type { PeriodSelection } from '@/entities/period';

export type PeriodTab = 'presets' | 'single_day' | 'date_range' | 'months';
export type PeriodPreset = 'today' | 'yesterday' | '7d' | '30d' | 'this_month' | 'last_month' | 'all';

const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const daysAgo = (days: number) => { const date = new Date(); date.setDate(date.getDate() - days); return localDate(date); };
export const currentMonth = (offset = 0) => { const date = new Date(); date.setMonth(date.getMonth() + offset); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; };
export const readableDate = (value: string) => {
  if (!value) return '';
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-DO', { day: 'numeric', month: 'short' });
};
export const readableMonth = (value: string) => {
  if (!value) return '';
  const [year, month] = value.split('-').map(Number);
  const label = new Date(year, month - 1, 1).toLocaleDateString('es-DO', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

export const usePeriodFilterDialog = (onApply: (selection: PeriodSelection) => void) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PeriodTab>('presets');
  const [singleDate, setSingleDate] = useState(daysAgo(0));
  const [rangeStart, setRangeStart] = useState(daysAgo(7));
  const [rangeEnd, setRangeEnd] = useState(daysAgo(0));
  const months = useMemo(() => Array.from({ length: 12 }, (_, offset) => {
    const value = currentMonth(-offset);
    return { value, label: readableMonth(value) };
  }), []);
  const apply = (selection: PeriodSelection) => { onApply(selection); setIsOpen(false); };
  const applyPreset = (preset: PeriodPreset) => {
    const today = daysAgo(0);
    const yesterday = daysAgo(1);
    const options: Record<PeriodPreset, PeriodSelection> = {
      today: { startDate: today, endDate: today, label: `Hoy (${readableDate(today)})` },
      yesterday: { startDate: yesterday, endDate: yesterday, label: `Ayer (${readableDate(yesterday)})` },
      '7d': { startDate: daysAgo(6), endDate: today, label: 'Últimos 7 días' },
      '30d': { startDate: daysAgo(29), endDate: today, label: 'Últimos 30 días' },
      this_month: { month: currentMonth(), label: readableMonth(currentMonth()) },
      last_month: { month: currentMonth(-1), label: readableMonth(currentMonth(-1)) },
      all: { label: 'Todo el Histórico' },
    };
    apply(options[preset]);
  };
  const applySingleDay = () => singleDate && apply({ startDate: singleDate, endDate: singleDate, label: `${readableDate(singleDate)} ${singleDate.split('-')[0]}` });
  const applyRange = () => {
    if (!rangeStart || !rangeEnd) return;
    const [startDate, endDate] = rangeStart <= rangeEnd ? [rangeStart, rangeEnd] : [rangeEnd, rangeStart];
    apply({ startDate, endDate, label: `${readableDate(startDate)} — ${readableDate(endDate)}` });
  };
  const applyMonth = (month: string) => apply({ month, label: readableMonth(month) });
  return { isOpen, setIsOpen, activeTab, setActiveTab, singleDate, setSingleDate, rangeStart, setRangeStart, rangeEnd, setRangeEnd, months, applyPreset, applySingleDay, applyRange, applyMonth };
};
