import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { config } from '../config';
import { prisma } from '../config/database';
import { AppError } from '../errors/app-error';
import { NormalizedEmailProcessor } from '../ingestion/normalized-email.processor';
import type { NormalizedEmail } from '../ingestion/types';
import { ParserRegistry } from '../ingestion/parser-registry';
import { SecretCryptoService } from './secret-crypto.service';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_API_URL = 'https://gmail.googleapis.com/gmail/v1/users/me';
const GMAIL_READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const FAILED_CONTENT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type: string;
}

interface GmailProfile {
  emailAddress: string;
  historyId?: string;
}

interface GmailMessagePart {
  mimeType?: string;
  headers?: Array<{ name: string; value: string }>;
  body?: { data?: string };
  parts?: GmailMessagePart[];
}

interface GmailMessage {
  id: string;
  internalDate?: string;
  payload?: GmailMessagePart;
}

function hashState(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function safeReturnTo(value?: string) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/onboarding';
}

function redirectUrl(returnTo: string, status: 'connected' | 'error', code?: string) {
  const target = new URL(safeReturnTo(returnTo), config.appUrl);
  target.searchParams.set('gmail', status);
  if (code) target.searchParams.set('code', code);
  return target.toString();
}

async function googleJson<T>(url: string, accessToken: string): Promise<T> {
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

function decodeBase64Url(value?: string) {
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

function normalizeGmailMessage(message: GmailMessage): NormalizedEmail {
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

function serializeConnection<T extends Record<string, unknown>>(connection: T) {
  const {
    encryptedAccessToken: _accessToken,
    encryptedRefreshToken: _refreshToken,
    ...safeConnection
  } = connection;
  return safeConnection;
}

export class GmailConnectionService {
  private static assertConfigured() {
    if (!config.googleOAuthClientId || !config.googleOAuthClientSecret) {
      throw new AppError(503, 'GOOGLE_OAUTH_NOT_CONFIGURED', 'Google OAuth is not configured.');
    }
    // Validate encryption before redirecting a user to Google.
    SecretCryptoService.encrypt('configuration-check');
  }

  public static async createAuthorizationUrl(
    workspaceId: string,
    profileId: string,
    returnTo?: string
  ) {
    this.assertConfigured();
    const state = crypto.randomBytes(32).toString('base64url');
    await prisma.$transaction([
      prisma.oAuthState.deleteMany({ where: { expiresAt: { lte: new Date() } } }),
      prisma.oAuthState.create({
        data: {
          id: hashState(state),
          workspaceId,
          profileId,
          provider: 'GOOGLE',
          returnTo: safeReturnTo(returnTo),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      }),
    ]);

    const url = new URL(GOOGLE_AUTH_URL);
    url.searchParams.set('client_id', config.googleOAuthClientId);
    url.searchParams.set('redirect_uri', config.googleOAuthRedirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', GMAIL_READONLY_SCOPE);
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('include_granted_scopes', 'true');
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('state', state);
    return url.toString();
  }

  public static async completeAuthorization(code: string, state: string) {
    this.assertConfigured();
    const stateId = hashState(state);
    const oauthState = await prisma.oAuthState.findUnique({ where: { id: stateId } });
    if (!oauthState || oauthState.provider !== 'GOOGLE') {
      throw new AppError(400, 'INVALID_OAUTH_STATE', 'OAuth state is invalid.');
    }
    const claimed = await prisma.oAuthState.updateMany({
      where: { id: stateId, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) {
      throw new AppError(400, 'EXPIRED_OAUTH_STATE', 'OAuth state expired or was already used.');
    }

    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.googleOAuthClientId,
        client_secret: config.googleOAuthClientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: config.googleOAuthRedirectUri,
      }),
    });
    if (!tokenResponse.ok) {
      throw new AppError(502, 'GOOGLE_TOKEN_EXCHANGE_FAILED', 'Google authorization could not be completed.');
    }
    const tokens = (await tokenResponse.json()) as GoogleTokenResponse;
    const profile = await googleJson<GmailProfile>(`${GMAIL_API_URL}/profile`, tokens.access_token);
    const accountId = profile.emailAddress.trim().toLowerCase();
    const existing = await prisma.inboxConnection.findUnique({
      where: {
        workspaceId_provider_providerAccountId: {
          workspaceId: oauthState.workspaceId,
          provider: 'GOOGLE',
          providerAccountId: accountId,
        },
      },
    });
    if (!tokens.refresh_token && !existing?.encryptedRefreshToken) {
      throw new AppError(502, 'GOOGLE_REFRESH_TOKEN_MISSING', 'Google did not return offline access.');
    }

    const tokenExpiresAt = new Date(Date.now() + Math.max(tokens.expires_in || 3600, 60) * 1000);
    const connection = existing
      ? await prisma.inboxConnection.update({
          where: { id: existing.id },
          data: {
            email: accountId,
            status: 'ACTIVE',
            encryptedAccessToken: SecretCryptoService.encrypt(tokens.access_token),
            encryptedRefreshToken: tokens.refresh_token
              ? SecretCryptoService.encrypt(tokens.refresh_token)
              : existing.encryptedRefreshToken,
            tokenExpiresAt,
            scopes: (tokens.scope || GMAIL_READONLY_SCOPE).split(' ').filter(Boolean),
            syncCursor: profile.historyId || existing.syncCursor,
            lastErrorCode: null,
            grantedAt: new Date(),
            revokedAt: null,
          },
        })
      : await prisma.inboxConnection.create({
          data: {
            workspaceId: oauthState.workspaceId,
            provider: 'GOOGLE',
            providerAccountId: accountId,
            email: accountId,
            status: 'ACTIVE',
            encryptedAccessToken: SecretCryptoService.encrypt(tokens.access_token),
            encryptedRefreshToken: SecretCryptoService.encrypt(tokens.refresh_token!),
            tokenExpiresAt,
            scopes: (tokens.scope || GMAIL_READONLY_SCOPE).split(' ').filter(Boolean),
            syncCursor: profile.historyId,
            grantedAt: new Date(),
          },
        });

    return { connection: serializeConnection(connection), returnTo: oauthState.returnTo };
  }

  public static callbackRedirect(returnTo: string, code?: string) {
    return redirectUrl(returnTo, code ? 'error' : 'connected', code);
  }

  public static async list(workspaceId: string) {
    const connections = await prisma.inboxConnection.findMany({
      where: { workspaceId },
      include: {
        bankConnections: {
          select: {
            id: true,
            institutionCode: true,
            status: true,
            lastEventAt: true,
            institution: { select: { displayName: true, status: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return connections.map((connection) => serializeConnection(connection));
  }

  private static async accessToken(connectionId: string, workspaceId: string) {
    const connection = await prisma.inboxConnection.findFirst({
      where: { id: connectionId, workspaceId, provider: 'GOOGLE' },
    });
    if (!connection || connection.status === 'REVOKED') {
      throw new AppError(404, 'INBOX_CONNECTION_NOT_FOUND', 'Gmail connection was not found.');
    }
    if (
      connection.encryptedAccessToken &&
      connection.tokenExpiresAt &&
      connection.tokenExpiresAt.getTime() > Date.now() + 60_000
    ) {
      return { connection, accessToken: SecretCryptoService.decrypt(connection.encryptedAccessToken) };
    }
    if (!connection.encryptedRefreshToken) {
      await prisma.inboxConnection.update({
        where: { id: connection.id },
        data: { status: 'REAUTH_REQUIRED', lastErrorCode: 'GOOGLE_REFRESH_TOKEN_MISSING' },
      });
      throw new AppError(401, 'GOOGLE_REAUTH_REQUIRED', 'Reconnect Gmail to continue syncing.');
    }

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.googleOAuthClientId,
        client_secret: config.googleOAuthClientSecret,
        refresh_token: SecretCryptoService.decrypt(connection.encryptedRefreshToken),
        grant_type: 'refresh_token',
      }),
    });
    if (!response.ok) {
      await prisma.inboxConnection.update({
        where: { id: connection.id },
        data: { status: 'REAUTH_REQUIRED', lastErrorCode: 'GOOGLE_REFRESH_FAILED' },
      });
      throw new AppError(401, 'GOOGLE_REAUTH_REQUIRED', 'Reconnect Gmail to continue syncing.');
    }
    const tokens = (await response.json()) as GoogleTokenResponse;
    const updated = await prisma.inboxConnection.update({
      where: { id: connection.id },
      data: {
        encryptedAccessToken: SecretCryptoService.encrypt(tokens.access_token),
        tokenExpiresAt: new Date(Date.now() + Math.max(tokens.expires_in || 3600, 60) * 1000),
        status: 'ACTIVE',
        lastErrorCode: null,
      },
    });
    return { connection: updated, accessToken: tokens.access_token };
  }

  private static async senderQuery(lastSyncedAt?: Date | null) {
    const institutions = await prisma.financialInstitution.findMany({
      where: {
        code: { in: ParserRegistry.supportedInstitutionCodes() },
        status: { in: ['PILOT', 'ACTIVE'] },
      },
      select: { senderPatterns: true },
    });
    const senders = Array.from(new Set(institutions.flatMap((item) => item.senderPatterns)))
      .map((pattern) => pattern.trim().toLowerCase())
      .filter(Boolean)
      .map((pattern) => `from:${pattern.startsWith('@') ? pattern.slice(1) : pattern}`);
    if (!senders.length) {
      throw new AppError(503, 'BANK_SENDERS_NOT_CONFIGURED', 'No supported bank senders are configured.');
    }
    const dateFilter = lastSyncedAt
      ? `after:${Math.floor((lastSyncedAt.getTime() - 5 * 60 * 1000) / 1000)}`
      : `newer_than:${config.gmailInitialSyncDays}d`;
    return `{${senders.join(' ')}} ${dateFilter}`;
  }

  public static async sync(workspaceId: string, connectionId: string) {
    const syncStartedAt = new Date();
    const { connection, accessToken } = await this.accessToken(connectionId, workspaceId);
    const query = await this.senderQuery(connection.lastSyncedAt);
    const messageIds: string[] = [];
    let pageToken = '';

    while (messageIds.length < config.gmailSyncMaxMessages) {
      const params = new URLSearchParams({
        q: query,
        maxResults: String(Math.min(100, config.gmailSyncMaxMessages - messageIds.length)),
      });
      if (pageToken) params.set('pageToken', pageToken);
      const page = await googleJson<{
        messages?: Array<{ id: string }>;
        nextPageToken?: string;
      }>(`${GMAIL_API_URL}/messages?${params.toString()}`, accessToken);
      messageIds.push(...(page.messages || []).map((message) => message.id));
      pageToken = page.nextPageToken || '';
      if (!pageToken) break;
    }

    const summary = { scanned: messageIds.length, parsed: 0, created: 0, duplicates: 0, ignored: 0, failed: 0 };
    for (const messageId of messageIds) {
      const providerEventId = `gmail:${connection.id}:${messageId}`;
      let eventId = '';
      try {
        const event = await prisma.ingestionEvent.create({
          data: {
            workspaceId,
            inboxConnectionId: connection.id,
            provider: 'GOOGLE_GMAIL',
            providerEventId,
            providerEmailId: messageId,
            status: 'PROCESSING',
            attempts: 1,
          },
        });
        eventId = event.id;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          summary.duplicates += 1;
          continue;
        }
        throw error;
      }

      let normalized: NormalizedEmail | null = null;
      try {
        const message = await googleJson<GmailMessage>(
          `${GMAIL_API_URL}/messages/${encodeURIComponent(messageId)}?format=full`,
          accessToken
        );
        normalized = normalizeGmailMessage(message);
        const result = await NormalizedEmailProcessor.process({
          workspaceId,
          email: normalized,
          ingestionChannel: 'GMAIL_OAUTH',
          inboxConnectionId: connection.id,
          sourceEmail: connection.email,
        });

        if (result.status === 'parsed') {
          summary.parsed += 1;
          summary.created += result.created;
          summary.duplicates += result.duplicates;
          await prisma.ingestionEvent.update({
            where: { id: eventId },
            data: {
              status: 'SUCCEEDED',
              bankConnectionId: result.bankConnectionId,
              parserCode: result.parserCode,
              parserVersion: result.parserVersion,
              processedAt: new Date(),
            },
          });
        } else if (result.status === 'ignored') {
          summary.ignored += 1;
          await prisma.ingestionEvent.update({
            where: { id: eventId },
            data: {
              status: 'IGNORED',
              parserCode: result.parserCode,
              parserVersion: result.parserVersion,
              errorCode: result.reason,
              processedAt: new Date(),
            },
          });
        } else {
          summary.failed += 1;
          const retained = SecretCryptoService.encrypt(
            JSON.stringify({
              id: normalized.id,
              from: normalized.from,
              to: normalized.to,
              subject: normalized.subject,
              html: normalized.html,
              text: normalized.text,
            })
          );
          await prisma.ingestionEvent.update({
            where: { id: eventId },
            data: {
              status: 'FAILED',
              parserCode: result.parserCode,
              parserVersion: result.parserVersion,
              errorCode: result.reason,
              errorMessage: result.reason,
              rawContent: retained,
              rawContentExpiresAt: new Date(Date.now() + FAILED_CONTENT_TTL_MS),
            },
          });
        }
      } catch (error) {
        summary.failed += 1;
        const code = error instanceof AppError ? error.code : 'GMAIL_MESSAGE_PROCESSING_FAILED';
        const retained = normalized
          ? SecretCryptoService.encrypt(
              JSON.stringify({
                id: normalized.id,
                from: normalized.from,
                to: normalized.to,
                subject: normalized.subject,
                html: normalized.html,
                text: normalized.text,
              })
            )
          : null;
        await prisma.ingestionEvent.update({
          where: { id: eventId },
          data: {
            status: 'FAILED',
            errorCode: code,
            errorMessage: code,
            rawContent: retained,
            rawContentExpiresAt: retained ? new Date(Date.now() + FAILED_CONTENT_TTL_MS) : null,
          },
        });
      }
    }

    const profile = await googleJson<GmailProfile>(`${GMAIL_API_URL}/profile`, accessToken);
    await prisma.inboxConnection.update({
      where: { id: connection.id },
      data: {
        status: 'ACTIVE',
        syncCursor: profile.historyId || connection.syncCursor,
        lastSyncedAt: syncStartedAt,
        lastErrorCode: null,
      },
    });
    return summary;
  }

  public static async disconnect(workspaceId: string, connectionId: string) {
    const connection = await prisma.inboxConnection.findFirst({
      where: { id: connectionId, workspaceId, provider: 'GOOGLE' },
    });
    if (!connection) {
      throw new AppError(404, 'INBOX_CONNECTION_NOT_FOUND', 'Gmail connection was not found.');
    }

    const encryptedToken = connection.encryptedRefreshToken || connection.encryptedAccessToken;
    if (encryptedToken) {
      const token = SecretCryptoService.decrypt(encryptedToken);
      await fetch('https://oauth2.googleapis.com/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token }),
      }).catch(() => undefined);
    }

    await prisma.$transaction([
      prisma.bankConnection.updateMany({
        where: { workspaceId, inboxConnectionId: connection.id },
        data: { status: 'DISABLED' },
      }),
      prisma.inboxConnection.update({
        where: { id: connection.id },
        data: {
          status: 'REVOKED',
          encryptedAccessToken: null,
          encryptedRefreshToken: null,
          tokenExpiresAt: null,
          revokedAt: new Date(),
        },
      }),
    ]);
  }
}
