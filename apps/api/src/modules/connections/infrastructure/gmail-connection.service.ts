import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { config } from '../../../config';
import { prisma } from '../../../config/database';
import { AppError } from '../../../errors/app-error';
import { NormalizedEmailProcessor } from '../../../ingestion/normalized-email.processor';
import type { NormalizedEmail } from '../../../ingestion/types';
import { ParserRegistry } from '../../../ingestion/parser-registry';
import { SecretCryptoService } from '../../../services/secret-crypto.service';
import { LegalService } from '../../../services/legal.service';

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

interface GmailHistoryResponse {
  history?: Array<{
    messagesAdded?: Array<{ message?: { id?: string } }>;
  }>;
  nextPageToken?: string;
  historyId?: string;
}

interface GmailWatchResponse {
  historyId: string;
  expiration: string;
}

type SyncSummary = {
  scanned: number;
  parsed: number;
  created: number;
  duplicates: number;
  ignored: number;
  failed: number;
};

export type GmailReplayFilters = {
  bank?: string;
  errors?: string[];
  parserVersion?: string;
  statuses?: Array<'FAILED' | 'IGNORED'>;
};

function emptySummary(): SyncSummary {
  return { scanned: 0, parsed: 0, created: 0, duplicates: 0, ignored: 0, failed: 0 };
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
            // Keep the last imported cursor when access is restored. Advancing it
            // here would skip messages received while the connection was revoked.
            syncCursor: existing.syncCursor || profile.historyId,
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

    await LegalService.recordGoogleConsent(
      oauthState.profileId,
      connection.id,
      (tokens.scope || GMAIL_READONLY_SCOPE).split(' ').filter(Boolean)
    );

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
    return Promise.all(
      connections.map(async (connection) => {
        const [currentJob, failedEvents] = await Promise.all([
          prisma.ingestionJob.findFirst({
            where: {
              inboxConnectionId: connection.id,
            },
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              type: true,
              status: true,
              attempts: true,
              maxAttempts: true,
              errorCode: true,
              errorMessage: true,
              createdAt: true,
              startedAt: true,
              processedAt: true,
            },
          }),
          prisma.ingestionEvent.count({
            where: {
              inboxConnectionId: connection.id,
              provider: 'GOOGLE_GMAIL',
              status: 'FAILED',
            },
          }),
        ]);
        return serializeConnection({ ...connection, currentJob, failedEvents });
      })
    );
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

  private static retain(email: NormalizedEmail) {
    return SecretCryptoService.encrypt(
      JSON.stringify({
        id: email.id,
        messageId: email.messageId,
        from: email.from,
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
        headers: email.headers,
        receivedAt: email.receivedAt.toISOString(),
      })
    );
  }

  private static async processMessage(input: {
    workspaceId: string;
    connection: { id: string; email: string };
    accessToken: string;
    messageId: string;
    summary: SyncSummary;
    allowReplay?: boolean;
    replayStatuses?: Array<'FAILED' | 'PENDING' | 'IGNORED'>;
    retainedEmail?: NormalizedEmail | null;
  }) {
    const providerEventId = `gmail:${input.connection.id}:${input.messageId}`;
    const existing = await prisma.ingestionEvent.findUnique({ where: { providerEventId } });
    let eventId = existing?.id || '';

    if (existing) {
      const replayStatuses = input.replayStatuses || ['FAILED', 'PENDING'];
      if (!input.allowReplay || !replayStatuses.includes(existing.status as 'FAILED' | 'PENDING' | 'IGNORED')) {
        input.summary.duplicates += 1;
        return;
      }
      const claimed = await prisma.ingestionEvent.updateMany({
        where: { id: existing.id, status: existing.status },
        data: {
          status: 'PROCESSING',
          attempts: { increment: 1 },
          errorCode: null,
          errorMessage: null,
          nextAttemptAt: null,
        },
      });
      if (claimed.count !== 1) {
        input.summary.duplicates += 1;
        return;
      }
    } else {
      try {
        const event = await prisma.ingestionEvent.create({
          data: {
            workspaceId: input.workspaceId,
            inboxConnectionId: input.connection.id,
            provider: 'GOOGLE_GMAIL',
            providerEventId,
            providerEmailId: input.messageId,
            status: 'PROCESSING',
            attempts: 1,
          },
        });
        eventId = event.id;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          input.summary.duplicates += 1;
          return;
        }
        throw error;
      }
    }

    let normalized = input.retainedEmail || null;
    try {
      if (!normalized) {
        const message = await googleJson<GmailMessage>(
          `${GMAIL_API_URL}/messages/${encodeURIComponent(input.messageId)}?format=full`,
          input.accessToken
        );
        normalized = normalizeGmailMessage(message);
      }
      const result = await NormalizedEmailProcessor.process({
        workspaceId: input.workspaceId,
        email: normalized,
        ingestionChannel: 'GMAIL_OAUTH',
        inboxConnectionId: input.connection.id,
        sourceEmail: input.connection.email,
      });

      if (result.status === 'parsed') {
        input.summary.parsed += 1;
        input.summary.created += result.created;
        input.summary.duplicates += result.duplicates;
        await prisma.ingestionEvent.update({
          where: { id: eventId },
          data: {
            status: 'SUCCEEDED',
            bankConnectionId: result.bankConnectionId,
            parserCode: result.parserCode,
            parserVersion: result.parserVersion,
            errorCode: null,
            errorMessage: null,
            rawContent: null,
            rawContentExpiresAt: null,
            processedAt: new Date(),
          },
        });
        return;
      }
      if (result.status === 'ignored') {
        input.summary.ignored += 1;
        await prisma.ingestionEvent.update({
          where: { id: eventId },
          data: {
            status: 'IGNORED',
            parserCode: result.parserCode,
            parserVersion: result.parserVersion,
            errorCode: result.reason,
            errorMessage: null,
            rawContent: null,
            rawContentExpiresAt: null,
            processedAt: new Date(),
          },
        });
        return;
      }

      input.summary.failed += 1;
      await prisma.ingestionEvent.update({
        where: { id: eventId },
        data: {
          status: 'FAILED',
          parserCode: result.parserCode,
          parserVersion: result.parserVersion,
          errorCode: result.reason,
          errorMessage: result.reason,
          rawContent: this.retain(normalized),
          rawContentExpiresAt: existing?.rawContentExpiresAt
            ?? new Date(Date.now() + FAILED_CONTENT_TTL_MS),
          nextAttemptAt: null,
        },
      });
    } catch (error) {
      input.summary.failed += 1;
      const code = error instanceof AppError ? error.code : 'GMAIL_MESSAGE_PROCESSING_FAILED';
      const parser = normalized ? ParserRegistry.detect(normalized) : null;
      await prisma.ingestionEvent.update({
        where: { id: eventId },
        data: {
          status: 'FAILED',
          parserCode: parser?.institutionCode || existing?.parserCode,
          parserVersion: parser?.version || existing?.parserVersion,
          errorCode: code,
          errorMessage: code,
          rawContent: normalized ? this.retain(normalized) : existing?.rawContent,
          rawContentExpiresAt: existing?.rawContentExpiresAt
            ?? (normalized || existing?.rawContent
              ? new Date(Date.now() + FAILED_CONTENT_TTL_MS)
              : null),
          nextAttemptAt: null,
        },
      });
    }
  }

  private static async processIds(
    workspaceId: string,
    connection: { id: string; email: string },
    accessToken: string,
    messageIds: string[],
    summary: SyncSummary
  ) {
    summary.scanned += messageIds.length;
    for (let index = 0; index < messageIds.length; index += config.gmailSyncConcurrency) {
      const chunk = messageIds.slice(index, index + config.gmailSyncConcurrency);
      await Promise.all(chunk.map((messageId) => this.processMessage({
        workspaceId,
        connection,
        accessToken,
        messageId,
        summary,
      })));
    }
  }

  private static async finishSync(connectionId: string, cursor: string | null | undefined, summary: SyncSummary) {
    const now = new Date();
    const unresolvedFailures = await prisma.ingestionEvent.count({
      where: { inboxConnectionId: connectionId, provider: 'GOOGLE_GMAIL', status: 'FAILED' },
    });
    await prisma.inboxConnection.update({
      where: { id: connectionId },
      data: {
        status: 'ACTIVE',
        ...(cursor ? { syncCursor: cursor } : {}),
        lastSyncedAt: now,
        lastSuccessfulSyncAt: now,
        lastSyncSummary: summary,
        lastErrorCode: summary.failed > 0 || unresolvedFailures > 0 ? 'PARTIAL_SYNC_FAILURE' : null,
        syncLeaseUntil: null,
        nextReconcileAt: new Date(now.getTime() + config.gmailReconcileIntervalMinutes * 60_000),
      },
    });
  }

  public static async syncFull(workspaceId: string, connectionId: string, initial = false) {
    const { connection, accessToken } = await this.accessToken(connectionId, workspaceId);
    const query = await this.senderQuery(initial ? null : connection.lastSuccessfulSyncAt || connection.lastSyncedAt);
    const summary = emptySummary();
    let pageToken = '';
    do {
      const params = new URLSearchParams({ q: query, maxResults: '100' });
      if (pageToken) params.set('pageToken', pageToken);
      const page = await googleJson<{ messages?: Array<{ id: string }>; nextPageToken?: string }>(
        `${GMAIL_API_URL}/messages?${params.toString()}`,
        accessToken
      );
      await this.processIds(
        workspaceId,
        connection,
        accessToken,
        (page.messages || []).map((message) => message.id),
        summary
      );
      pageToken = page.nextPageToken || '';
    } while (pageToken);

    const profile = await googleJson<GmailProfile>(`${GMAIL_API_URL}/profile`, accessToken);
    await this.finishSync(connection.id, profile.historyId || connection.syncCursor, summary);
    return summary;
  }

  public static async syncIncremental(workspaceId: string, connectionId: string) {
    const { connection, accessToken } = await this.accessToken(connectionId, workspaceId);
    if (!connection.syncCursor) return this.syncFull(workspaceId, connectionId, false);

    const summary = emptySummary();
    const messageIds = new Set<string>();
    let pageToken = '';
    let finalHistoryId = connection.syncCursor;
    do {
      const params = new URLSearchParams({
        startHistoryId: connection.syncCursor,
        historyTypes: 'messageAdded',
        maxResults: '500',
      });
      if (pageToken) params.set('pageToken', pageToken);
      const response = await fetch(`${GMAIL_API_URL}/history?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
      });
      if (response.status === 404) return this.syncFull(workspaceId, connectionId, false);
      if (!response.ok) {
        throw new AppError(response.status === 401 ? 401 : 502, 'GOOGLE_HISTORY_ERROR', 'Gmail history could not be synchronized.');
      }
      const page = (await response.json()) as GmailHistoryResponse;
      for (const history of page.history || []) {
        for (const added of history.messagesAdded || []) {
          if (added.message?.id) messageIds.add(added.message.id);
        }
      }
      finalHistoryId = page.historyId || finalHistoryId;
      pageToken = page.nextPageToken || '';
    } while (pageToken);

    const supportedQuery = await this.senderQuery(null);
    const senderTerms = Array.from(supportedQuery.matchAll(/from:([^\s}]+)/g)).map((match) => match[1]);
    const supportedIds: string[] = [];
    for (const messageId of messageIds) {
      const metadata = await googleJson<GmailMessage>(
        `${GMAIL_API_URL}/messages/${encodeURIComponent(messageId)}?format=metadata&metadataHeaders=From`,
        accessToken
      );
      const from = (metadata.payload?.headers || []).find((header) => header.name.toLowerCase() === 'from')?.value.toLowerCase() || '';
      if (senderTerms.some((sender) => from.includes(sender.replace(/^@/, '').toLowerCase()))) supportedIds.push(messageId);
    }
    await this.processIds(workspaceId, connection, accessToken, supportedIds, summary);
    await this.finishSync(connection.id, finalHistoryId, summary);
    return summary;
  }

  public static async registerWatch(workspaceId: string, connectionId: string) {
    if (!config.googlePubSubTopic) return { enabled: false };
    const { connection, accessToken } = await this.accessToken(connectionId, workspaceId);
    const response = await fetch(`${GMAIL_API_URL}/watch`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topicName: config.googlePubSubTopic }),
    });
    if (!response.ok) throw new AppError(502, 'GOOGLE_WATCH_FAILED', 'Gmail push notifications could not be enabled.');
    const watch = (await response.json()) as GmailWatchResponse;
    await prisma.inboxConnection.update({
      where: { id: connection.id },
      data: {
        watchExpiresAt: new Date(Number(watch.expiration)),
        syncCursor: connection.syncCursor || watch.historyId,
        lastErrorCode: null,
      },
    });
    return { enabled: true, expiration: watch.expiration };
  }

  public static async replayFailed(
    workspaceId: string,
    connectionId: string,
    filters: GmailReplayFilters = {}
  ) {
    const { connection, accessToken } = await this.accessToken(connectionId, workspaceId);
    const events = await prisma.ingestionEvent.findMany({
      where: {
        workspaceId,
        inboxConnectionId: connectionId,
        provider: 'GOOGLE_GMAIL',
        status: { in: filters.statuses?.length ? filters.statuses : ['FAILED'] },
        ...(filters.bank ? { parserCode: filters.bank.toUpperCase() } : {}),
        ...(filters.errors?.length ? { errorCode: { in: filters.errors } } : {}),
        ...(filters.parserVersion ? { parserVersion: filters.parserVersion } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: 500,
    });
    const summary = emptySummary();
    summary.scanned = events.length;
    for (let index = 0; index < events.length; index += config.gmailSyncConcurrency) {
      const chunk = events.slice(index, index + config.gmailSyncConcurrency);
      await Promise.all(chunk.map(async (event) => {
        let retainedEmail: NormalizedEmail | null = null;
        if (event.rawContent) {
          try {
            const parsed = JSON.parse(SecretCryptoService.decrypt(event.rawContent)) as Record<string, unknown>;
            retainedEmail = {
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
            retainedEmail = null;
          }
        }
        if (!event.providerEmailId) return;
        await this.processMessage({
          workspaceId,
          connection,
          accessToken,
          messageId: event.providerEmailId,
          summary,
          allowReplay: true,
          replayStatuses: filters.statuses?.includes('IGNORED')
            ? ['FAILED', 'PENDING', 'IGNORED']
            : ['FAILED', 'PENDING'],
          retainedEmail,
        });
      }));
    }
    await this.finishSync(connection.id, connection.syncCursor, summary);
    return summary;
  }

  public static sync(workspaceId: string, connectionId: string) {
    return this.syncIncremental(workspaceId, connectionId);
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
    await LegalService.revokeGoogleConsent(connection.id);
  }
}
