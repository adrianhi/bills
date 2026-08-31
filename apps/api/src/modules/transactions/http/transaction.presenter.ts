import { stringify } from 'csv-stringify/sync';
import { institutionDisplayName } from '../domain/transaction-policy';

interface CsvTransaction {
  id: string;
  externalId: string;
  institutionCode: string;
  transactionDate: Date;
  cardLast4: string | null;
  cardType: string | null;
  rawMerchant: string;
  merchant: string;
  category: string;
  amount: { toFixed(digits: number): string };
  currency: string;
  status: string;
  statusCode: string;
  transactionType: string;
  source: string;
  notes: string | null;
  createdAt: Date;
}

export function serializeTransaction<T extends { amount: unknown }>(transaction: T) {
  return { ...transaction, amount: Number(transaction.amount) };
}

export function transactionsToCsv(transactions: CsvTransaction[]) {
  const rows = transactions.map((transaction) => ({
    'ID Transacción': transaction.id,
    'ID Externo (Gmail)': transaction.externalId,
    'Entidad / Banco': institutionDisplayName(transaction.institutionCode),
    'Fecha Transacción': transaction.transactionDate.toISOString(),
    Tarjeta: transaction.cardLast4 ? `**** ${transaction.cardLast4}` : 'N/A',
    'Tipo Tarjeta': transaction.cardType || 'N/A',
    'Comercio Crudo': transaction.rawMerchant,
    Comercio: transaction.merchant,
    Categoría: transaction.category,
    Monto: transaction.amount.toFixed(2),
    Moneda: transaction.currency,
    Estado: transaction.status,
    'Estado Código': transaction.statusCode,
    'Tipo Transacción': transaction.transactionType,
    Fuente: transaction.source,
    Notas: transaction.notes || '',
    'Fecha Registro': transaction.createdAt.toISOString(),
  }));
  return stringify(rows, { header: true, bom: true });
}
