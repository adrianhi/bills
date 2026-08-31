import type { IngestionEvent } from '@prisma/client';
import type { NormalizedEmail } from '../../../../ingestion/types';
import { SecretCryptoService } from '../../../../shared/infrastructure/secret-crypto.service';

export function retainEmail(email: NormalizedEmail): string {
  return SecretCryptoService.encrypt(JSON.stringify({
    id: email.id,
    messageId: email.messageId,
    from: email.from,
    to: email.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
    headers: email.headers,
    receivedAt: email.receivedAt.toISOString(),
  }));
}

export function restoreRetainedEmail(event: IngestionEvent): NormalizedEmail | null {
  if (!event.rawContent) return null;
  try {
    const parsed = JSON.parse(SecretCryptoService.decrypt(event.rawContent)) as Record<string, unknown>;
    return {
      id: String(parsed.id || event.providerEmailId || event.id),
      messageId: String(parsed.messageId || parsed.id || event.providerEmailId || event.id),
      from: String(parsed.from || ''),
      to: Array.isArray(parsed.to) ? parsed.to.map(String) : [],
      subject: String(parsed.subject || ''),
      html: typeof parsed.html === 'string' ? parsed.html : null,
      text: typeof parsed.text === 'string' ? parsed.text : null,
      headers: parsed.headers && typeof parsed.headers === 'object' ? parsed.headers as Record<string, string> : null,
      receivedAt: parsed.receivedAt ? new Date(String(parsed.receivedAt)) : event.createdAt,
    };
  } catch {
    return null;
  }
}
