import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'DOP'): string {
  const isUSD = currency.toUpperCase() === 'USD';
  const prefix = isUSD ? '$' : 'RD$ ';
  return `${prefix}${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(dateString: string | Date): string {
  if (!dateString) return '-';
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return String(dateString);

  return new Intl.DateTimeFormat('es-DO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export interface OrganizationMeta {
  id: string;
  name: string;
  shortName: string;
  badgeClass: string;
  dotColor: string;
}

export const ORGANIZATIONS: Record<string, OrganizationMeta> = {
  BHD: {
    id: 'BHD',
    name: 'Banco BHD',
    shortName: 'BHD',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    dotColor: '#10b981',
  },
  POPULAR: {
    id: 'POPULAR',
    name: 'Banco Popular',
    shortName: 'Popular',
    badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    dotColor: '#0284c7',
  },
  BANRESERVAS: {
    id: 'BANRESERVAS',
    name: 'Banreservas',
    shortName: 'Reservas',
    badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    dotColor: '#2563eb',
  },
  QIK: {
    id: 'QIK',
    name: 'Qik Banco Digital',
    shortName: 'Qik',
    badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    dotColor: '#8b5cf6',
  },
  APAP: {
    id: 'APAP',
    name: 'APAP',
    shortName: 'APAP',
    badgeClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    dotColor: '#f97316',
  },
  SCOTIABANK: {
    id: 'SCOTIABANK',
    name: 'Scotiabank',
    shortName: 'Scotia',
    badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    dotColor: '#f43f5e',
  },
  MANUAL: {
    id: 'MANUAL',
    name: 'Manual / Otro',
    shortName: 'Manual',
    badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
    dotColor: '#64748b',
  },
};

export function getOrganizationMeta(source?: string | null, merchant?: string | null): OrganizationMeta {
  const src = (source || '').toUpperCase();
  const merch = (merchant || '').toUpperCase();

  if (src.includes('POPULAR') || src.includes('BPD') || merch.includes('BANCO POPULAR')) return ORGANIZATIONS.POPULAR;
  if (src.includes('BANRESERVAS') || src.includes('RESERVAS') || merch.includes('BANRESERVAS')) return ORGANIZATIONS.BANRESERVAS;
  if (src.includes('QIK') || merch.includes('QIK')) return ORGANIZATIONS.QIK;
  if (src.includes('APAP') || merch.includes('APAP')) return ORGANIZATIONS.APAP;
  if (src.includes('SCOTIA') || merch.includes('SCOTIABANK')) return ORGANIZATIONS.SCOTIABANK;
  if (src.includes('MANUAL') || src.includes('OTHER')) return ORGANIZATIONS.MANUAL;
  return ORGANIZATIONS.BHD;
}
