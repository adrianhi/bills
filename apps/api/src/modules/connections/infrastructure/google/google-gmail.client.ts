import { AppError } from '../../../../errors/app-error';
import type { NormalizedEmail } from '../../../../ingestion/types';
import type {
  GmailHistoryPage,
  GmailMessage,
  GmailMessagePage,
  GmailMessagePart,
  GmailProfile,
  GmailWatchResponse,
  GoogleTokenResponse,
} from './gmail-types';

export const GMAIL_READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_API_URL = 'https://gmail.googleapis.com/gmail/v1/users/me';

function decodeBase64Url(value?: string): string {
  return value ? Buffer.from(value, 'base64url').toString('utf8') : '';
}

function findBody(part: GmailMessagePart | undefined, mimeType: string): string {
  if (!part) return '';
  if (part.mimeType === mimeType && part.body?.data) return decodeBase64Url(part.body.data);
  for (const child of part.parts || []) {
    const value = findBody(child, mimeType);
    if (value) return value;
  }
  return '';
}

export function normalizeGmailMessage(message: GmailMessage): NormalizedEmail {
  const headers = Object.fromEntries(
    (message.payload?.headers || []).map((header) => [header.name.toLowerCase(), header.value])
  );
  const plain = findBody(message.payload, 'text/plain');
  const html = findBody(message.payload, 'text/html');
  return {
    id: message.id,
    messageId: headers['message-id'] || message.id,
    from: headers.from || '',
    to: (headers.to || '').split(',').map((value) => value.trim()).filter(Boolean),
    subject: headers.subject || '',
    text: plain || null,
    html: html || null,
    headers,
    receivedAt: message.internalDate
      ? new Date(Number(message.internalDate))
      : headers.date
        ? new Date(headers.date)
        : new Date(),
  };
}

export class GoogleGmailClient {
  public constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly redirectUri: string
  ) {}

  private async json<T>(url: string, accessToken: string): Promise<T> {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new AppError(
        response.status === 401 ? 401 : 502,
        response.status === 401 ? 'GOOGLE_REAUTH_REQUIRED' : 'GOOGLE_API_ERROR',
        'Google could not complete the requested operation.'
      );
    }
    return (await response.json()) as T;
  }

  private tokenRequest(params: Record<string, string>): Promise<Response> {
    return fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: this.clientId, client_secret: this.clientSecret, ...params }),
    });
  }

  public async exchangeCode(code: string): Promise<GoogleTokenResponse> {
    const response = await this.tokenRequest({ code, grant_type: 'authorization_code', redirect_uri: this.redirectUri });
    if (!response.ok) throw new AppError(502, 'GOOGLE_TOKEN_EXCHANGE_FAILED', 'Google authorization could not be completed.');
    return (await response.json()) as GoogleTokenResponse;
  }

  public async refreshToken(refreshToken: string): Promise<GoogleTokenResponse> {
    const response = await this.tokenRequest({ refresh_token: refreshToken, grant_type: 'refresh_token' });
    if (!response.ok) throw new AppError(401, 'GOOGLE_REAUTH_REQUIRED', 'Reconnect Gmail to continue syncing.');
    return (await response.json()) as GoogleTokenResponse;
  }

  public profile(accessToken: string): Promise<GmailProfile> {
    return this.json(`${GMAIL_API_URL}/profile`, accessToken);
  }

  public message(accessToken: string, messageId: string, format = 'full'): Promise<GmailMessage> {
    const suffix = format === 'metadata' ? '&metadataHeaders=From' : '';
    return this.json(`${GMAIL_API_URL}/messages/${encodeURIComponent(messageId)}?format=${format}${suffix}`, accessToken);
  }

  public listMessages(accessToken: string, query: string, pageToken?: string): Promise<GmailMessagePage> {
    const params = new URLSearchParams({ q: query, maxResults: '100' });
    if (pageToken) params.set('pageToken', pageToken);
    return this.json(`${GMAIL_API_URL}/messages?${params.toString()}`, accessToken);
  }

  public async history(accessToken: string, cursor: string, pageToken?: string): Promise<GmailHistoryPage | null> {
    const params = new URLSearchParams({ startHistoryId: cursor, historyTypes: 'messageAdded', maxResults: '500' });
    if (pageToken) params.set('pageToken', pageToken);
    const response = await fetch(`${GMAIL_API_URL}/history?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new AppError(response.status === 401 ? 401 : 502, 'GOOGLE_HISTORY_ERROR', 'Gmail history could not be synchronized.');
    return (await response.json()) as GmailHistoryPage;
  }

  public async watch(accessToken: string, topicName: string): Promise<GmailWatchResponse> {
    const response = await fetch(`${GMAIL_API_URL}/watch`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicName }),
    });
    if (!response.ok) throw new AppError(502, 'GOOGLE_WATCH_FAILED', 'Gmail push notifications could not be enabled.');
    return (await response.json()) as GmailWatchResponse;
  }

  public async revoke(token: string): Promise<void> {
    await fetch('https://oauth2.googleapis.com/revoke', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token }),
    }).catch(() => undefined);
  }
}
