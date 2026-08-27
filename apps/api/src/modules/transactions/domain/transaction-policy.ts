import type { TransactionStatusCodeName } from '../../../domain/transaction-status';

export interface MovementClassification {
  transactionType?: string | null;
  category?: string | null;
  source?: string | null;
}

export function isIncomeMovement(transaction: MovementClassification): boolean {
  return /recibida/i.test(transaction.transactionType || '') ||
    /ingreso/i.test(transaction.category || '') || transaction.source === 'BHD_TRANSFER_INCOME';
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

export function resolveDateRange(month?: string, startDate?: string, endDate?: string): DateRange {
  if (startDate || endDate) return {
    ...(startDate ? { gte: new Date(startDate.length === 10 ? `${startDate}T00:00:00.000Z` : startDate) } : {}),
    ...(endDate ? { lte: new Date(endDate.length === 10 ? `${endDate}T23:59:59.999Z` : endDate) } : {}),
  };
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [year, value] = month.split('-').map(Number);
    return { gte: new Date(Date.UTC(year, value - 1, 1)), lte: new Date(Date.UTC(year, value, 0, 23, 59, 59, 999)) };
  }
  return {};
}
