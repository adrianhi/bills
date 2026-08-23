export interface NormalizedEmail {
  id: string;
  messageId: string;
  from: string;
  to: string[];
  subject: string;
  html?: string | null;
  text?: string | null;
  headers?: Record<string, string> | null;
  receivedAt: Date;
}

export interface NormalizedTransaction {
  externalId: string;
  cardLast4?: string | null;
  cardType?: string | null;
  rawMerchant: string;
  merchant?: string | null;
  category?: string | null;
  amount: number;
  currency: string;
  status: string;
  transactionType: string;
  transactionDate: Date;
  source: string;
  institutionCode: string;
  ingestionChannel: 'EMAIL_FORWARD';
  notes?: string | null;
}

export type ParseResult =
  | { status: 'parsed'; transactions: NormalizedTransaction[] }
  | { status: 'ignored'; reason: string }
  | { status: 'unsupported'; reason: string };

export interface BankEmailParser {
  institutionCode: string;
  version: string;
  canParse(email: NormalizedEmail): boolean;
  parse(email: NormalizedEmail): Promise<ParseResult>;
}
