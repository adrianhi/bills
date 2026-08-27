export const TRANSACTION_STATUS_CODES = ['PENDING', 'APPROVED', 'DECLINED', 'REVERSED'] as const;

export type TransactionStatusCodeName = (typeof TRANSACTION_STATUS_CODES)[number];

export function normalizeTransactionStatus(value?: string | null): TransactionStatusCodeName {
  const normalized = (value || '').trim().toLowerCase();
  if (/reversad|anulad/.test(normalized)) return 'REVERSED';
  if (/rechazad|declinad|denegad/.test(normalized)) return 'DECLINED';
  if (/pendiente|procesando|en proceso/.test(normalized)) return 'PENDING';
  if (TRANSACTION_STATUS_CODES.includes((value || '') as TransactionStatusCodeName)) {
    return value as TransactionStatusCodeName;
  }
  return 'APPROVED';
}

export function transactionStatusLabel(status: TransactionStatusCodeName) {
  switch (status) {
    case 'REVERSED': return 'Reversada';
    case 'DECLINED': return 'Rechazada';
    case 'PENDING': return 'Pendiente';
    default: return 'Aprobada';
  }
}

export function isEffectiveTransaction(status?: TransactionStatusCodeName | null) {
  return status === 'APPROVED';
}
