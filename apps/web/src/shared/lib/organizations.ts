export interface OrganizationMeta {
  id: string;
  name: string;
  shortName: string;
  badgeClass: string;
  dotColor: string;
}

export const ORGANIZATIONS: Record<string, OrganizationMeta> = {
  BHD: { id: 'BHD', name: 'Banco BHD', shortName: 'BHD', badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', dotColor: '#10b981' },
  POPULAR: { id: 'POPULAR', name: 'Banco Popular', shortName: 'Popular', badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20', dotColor: '#0284c7' },
  BANRESERVAS: { id: 'BANRESERVAS', name: 'Banreservas', shortName: 'Reservas', badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', dotColor: '#2563eb' },
  QIK: { id: 'QIK', name: 'Qik Banco Digital', shortName: 'Qik', badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20', dotColor: '#8b5cf6' },
  APAP: { id: 'APAP', name: 'APAP', shortName: 'APAP', badgeClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20', dotColor: '#f97316' },
  SCOTIABANK: { id: 'SCOTIABANK', name: 'Scotiabank', shortName: 'Scotia', badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20', dotColor: '#f43f5e' },
  MANUAL: { id: 'MANUAL', name: 'Manual / Otro', shortName: 'Manual', badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20', dotColor: '#64748b' },
};

export function getOrganizationMeta(source?: string | null, merchant?: string | null): OrganizationMeta {
  const sourceValue = (source || '').toUpperCase();
  const merchantValue = (merchant || '').toUpperCase();
  if (sourceValue.includes('POPULAR') || sourceValue.includes('BPD') || merchantValue.includes('BANCO POPULAR')) return ORGANIZATIONS.POPULAR;
  if (sourceValue.includes('BANRESERVAS') || sourceValue.includes('RESERVAS') || merchantValue.includes('BANRESERVAS')) return ORGANIZATIONS.BANRESERVAS;
  if (sourceValue.includes('QIK') || merchantValue.includes('QIK')) return ORGANIZATIONS.QIK;
  if (sourceValue.includes('APAP') || merchantValue.includes('APAP')) return ORGANIZATIONS.APAP;
  if (sourceValue.includes('SCOTIA') || merchantValue.includes('SCOTIABANK')) return ORGANIZATIONS.SCOTIABANK;
  if (sourceValue.includes('MANUAL') || sourceValue.includes('OTHER')) return ORGANIZATIONS.MANUAL;
  return ORGANIZATIONS.BHD;
}
