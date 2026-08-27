import type { TransactionStatusCode } from '@bills/contracts';
import type { Transaction } from './types';

export interface TransactionGroup {
  dateKey: string; title: string; subtitle: string;
  totalExpenseDOP: number; totalIncomeDOP: number; totalExpenseUSD: number; totalIncomeUSD: number;
  transactions: Transaction[];
}

export const statusCode = (transaction: Transaction): TransactionStatusCode => transaction.statusCode || (
  /reversad|anulad/i.test(transaction.status) ? 'REVERSED' : /rechazad|declinad|denegad/i.test(transaction.status) ? 'DECLINED' :
    /pendiente|procesando/i.test(transaction.status) ? 'PENDING' : 'APPROVED'
);
export const isReceivedTransfer = (transaction: Transaction) => transaction.source === 'BHD_TRANSFER_INCOME' ||
  /recibida/i.test(transaction.transactionType) || /recibida/i.test(transaction.category) || /ordenante/i.test(transaction.notes || '') ||
  (transaction.amount > 0 && /transferencia/i.test(transaction.transactionType) && /ingreso/i.test(transaction.category));
export const isSentTransfer = (transaction: Transaction) => transaction.source === 'BHD_TRANSFER_SENT' ||
  /enviada/i.test(transaction.transactionType) || /beneficiario/i.test(transaction.notes || '') ||
  (/transferencia/i.test(transaction.transactionType) && !isReceivedTransfer(transaction));
export const isServicePayment = (transaction: Transaction) => transaction.source === 'BHD_SERVICE_PAYMENT' ||
  /pago de servicio|impuesto|pago/i.test(transaction.transactionType);
export const isAtmWithdrawal = (transaction: Transaction) => /retiro/i.test(transaction.transactionType) || /retiro/i.test(transaction.rawMerchant);

export function formatGroupDate(value: string, now = new Date()) {
  const date = new Date(value);
  const same = (left: Date, right: Date) => left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (same(date, now)) return { title: 'Hoy', subtitle: date.toLocaleDateString('es-DO', { day: 'numeric', month: 'short' }) };
  if (same(date, yesterday)) return { title: 'Ayer', subtitle: date.toLocaleDateString('es-DO', { day: 'numeric', month: 'short' }) };
  const weekday = date.toLocaleDateString('es-DO', { weekday: 'long' });
  return { title: weekday.charAt(0).toUpperCase() + weekday.slice(1), subtitle: date.toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined }) };
}

export function groupTransactionsByDate(transactions: Transaction[]): TransactionGroup[] {
  const groups = new Map<string, TransactionGroup>();
  for (const transaction of transactions) {
    const date = new Date(transaction.transactionDate);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    if (!groups.has(dateKey)) {
      groups.set(dateKey, { dateKey, ...formatGroupDate(transaction.transactionDate), totalExpenseDOP: 0, totalIncomeDOP: 0, totalExpenseUSD: 0, totalIncomeUSD: 0, transactions: [] });
    }
    const group = groups.get(dateKey)!;
    group.transactions.push(transaction);
    if (statusCode(transaction) !== 'APPROVED') continue;
    const income = isReceivedTransfer(transaction);
    const amount = Number(transaction.amount) || 0;
    if (transaction.currency === 'USD') {
      if (income) group.totalIncomeUSD += amount; else group.totalExpenseUSD += amount;
    } else if (income) group.totalIncomeDOP += amount; else group.totalExpenseDOP += amount;
  }
  return [...groups.values()];
}
