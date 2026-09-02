import type { TransactionStatusCodeName } from '../../../domain/transaction-status';

export interface MovementClassification {
  transactionType?: string | null;
  category?: string | null;
  source?: string | null;
}

export function isIncomeMovement(transaction: MovementClassification): boolean {
  return /recibida/i.test(transaction.transactionType || '') ||
    /ingreso/i.test(transaction.category || '') || /transfer_income/i.test(transaction.source || '');
}

export function contributesToFinancialMetrics(status: TransactionStatusCodeName): boolean {
  return status === 'APPROVED';
}

const institutionNames: Readonly<Record<string, string>> = {
  BHD: 'Banco BHD', POPULAR: 'Banco Popular', BANRESERVAS: 'Banreservas',
  QIK: 'Qik Banco Digital', APAP: 'APAP', SCOTIABANK: 'Scotiabank',
  PROMERICA: 'Banco Promerica', CASH: 'Manual / Efectivo',
};

export function institutionDisplayName(code?: string | null): string {
  return institutionNames[(code || 'BHD').toUpperCase()] || code || 'Otra entidad';
}

export function resolveInstitutionCode(explicit?: string, source?: string): string {
  if (explicit) return explicit.toUpperCase();
  const value = (source || '').toUpperCase();
  if (value.includes('POPULAR') || value.includes('BPD')) return 'POPULAR';
  if (value.includes('BANRESERVAS') || value.includes('RESERVAS')) return 'BANRESERVAS';
  if (value.includes('QIK')) return 'QIK';
  if (value.includes('APAP')) return 'APAP';
  if (value.includes('SCOTIA')) return 'SCOTIABANK';
  if (value === 'MANUAL' || value.includes('CASH')) return 'CASH';
  return 'BHD';
}

export interface DateRange { gte?: Date; lte?: Date }

const santoDomingoBoundary = (date: string, endOfDay = false) =>
  new Date(`${date}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}-04:00`);

export function resolveDateRange(month?: string, startDate?: string, endDate?: string): DateRange {
  if (startDate || endDate) return {
    ...(startDate ? { gte: startDate.length === 10 ? santoDomingoBoundary(startDate) : new Date(startDate) } : {}),
    ...(endDate ? { lte: endDate.length === 10 ? santoDomingoBoundary(endDate, true) : new Date(endDate) } : {}),
  };
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [year, value] = month.split('-').map(Number);
    const start = `${year}-${String(value).padStart(2, '0')}-01`;
    const nextMonth = new Date(Date.UTC(year, value, 1));
    const next = `${nextMonth.getUTCFullYear()}-${String(nextMonth.getUTCMonth() + 1).padStart(2, '0')}-01`;
    return { gte: santoDomingoBoundary(start), lte: new Date(santoDomingoBoundary(next).getTime() - 1) };
  }
  return {};
}
