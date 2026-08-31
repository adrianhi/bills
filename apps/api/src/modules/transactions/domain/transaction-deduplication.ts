interface TransferCandidate {
  cardLast4?: string | null;
  transactionType?: string | null;
  category?: string | null;
  merchant?: string | null;
  rawMerchant: string;
}

interface IncomingTransfer extends TransferCandidate {
  merchant?: string | null;
}

const transferPattern = /transferencia|recibida|enviada/i;

export function isFuzzyTransferMatch(candidate: TransferCandidate, incoming: IncomingTransfer): boolean {
  const sameAccount = !incoming.cardLast4 || !candidate.cardLast4 || incoming.cardLast4 === candidate.cardLast4;
  const candidateIsTransfer = transferPattern.test(candidate.transactionType || '')
    || transferPattern.test(candidate.category || '');
  const incomingIsTransfer = transferPattern.test(incoming.transactionType || '')
    || transferPattern.test(incoming.category || '');
  return sameAccount && candidateIsTransfer && incomingIsTransfer;
}

export function mostCompleteMerchant(candidate: TransferCandidate, incoming: IncomingTransfer): string {
  if (incoming.merchant && incoming.merchant.length > (candidate.merchant?.length || 0)) return incoming.merchant;
  if (incoming.rawMerchant.length > candidate.rawMerchant.length) return incoming.rawMerchant;
  return candidate.merchant || candidate.rawMerchant;
}
