import crypto from 'crypto';
import { config } from '../../../config';
import { prisma } from '../../../config/database';
import { AppError } from '../../../errors/app-error';
import { SecretCryptoService } from '../../../shared/infrastructure/secret-crypto.service';
import type { GmailConnectionLifecycle } from '../application/gmail-connection.port';
import { InstitutionSelectionService } from './institution-selection.service';
import { GoogleGmailClient, GMAIL_READONLY_SCOPE } from './google/google-gmail.client';
import { PrismaGmailConnectionReader, serializeConnection } from './prisma-gmail-connection.reader';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

function hashState(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function safeReturnTo(value?: string): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/onboarding';
}

export class GmailLifecycleService implements GmailConnectionLifecycle {
  public constructor(
    private readonly google: GoogleGmailClient,
    private readonly reader: PrismaGmailConnectionReader,
    private readonly consent: {
      record(profileId: string, connectionId: string, scopes: string[]): Promise<unknown>;
      revoke(connectionId: string): Promise<unknown>;
    }
  ) {}

  private assertConfigured(): void {
    if (!config.googleOAuthClientId || !config.googleOAuthClientSecret) {
      throw new AppError(503, 'GOOGLE_OAUTH_NOT_CONFIGURED', 'Google OAuth is not configured.');
    }
    SecretCryptoService.encrypt('configuration-check');
  }

  public async createAuthorizationUrl(
    workspaceId: string,
    profileId: string,
    institutionCodes: string[],
    returnTo?: string
  ): Promise<string> {
    this.assertConfigured();
    const selectedCodes = await InstitutionSelectionService.validate(institutionCodes);
    const state = crypto.randomBytes(32).toString('base64url');
    await prisma.$transaction([
      prisma.oAuthState.deleteMany({ where: { expiresAt: { lte: new Date() } } }),
      prisma.oAuthState.create({
        data: {
          id: hashState(state), workspaceId, profileId, provider: 'GOOGLE',
          returnTo: safeReturnTo(returnTo), institutionCodes: selectedCodes,
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

  public async completeAuthorization(code: string, state: string): Promise<{ connection: Record<string, unknown>; returnTo: string }> {
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

    const tokens = await this.google.exchangeCode(code);
    const profile = await this.google.profile(tokens.access_token);
    const accountId = profile.emailAddress.trim().toLowerCase();
    const existing = await prisma.inboxConnection.findUnique({
      where: { workspaceId_provider_providerAccountId: { workspaceId: oauthState.workspaceId, provider: 'GOOGLE', providerAccountId: accountId } },
    });
    if (!tokens.refresh_token && !existing?.encryptedRefreshToken) {
      throw new AppError(502, 'GOOGLE_REFRESH_TOKEN_MISSING', 'Google did not return offline access.');
    }
    const tokenExpiresAt = new Date(Date.now() + Math.max(tokens.expires_in || 3600, 60) * 1000);
    const common = {
      email: accountId,
      status: 'ACTIVE' as const,
      encryptedAccessToken: SecretCryptoService.encrypt(tokens.access_token),
      tokenExpiresAt,
      scopes: (tokens.scope || GMAIL_READONLY_SCOPE).split(' ').filter(Boolean),
      lastErrorCode: null,
      grantedAt: new Date(),
      revokedAt: null,
    };
    const connection = existing
      ? await prisma.inboxConnection.update({
          where: { id: existing.id },
          data: {
            ...common,
            encryptedRefreshToken: tokens.refresh_token ? SecretCryptoService.encrypt(tokens.refresh_token) : existing.encryptedRefreshToken,
            syncCursor: existing.syncCursor || profile.historyId,
          },
        })
      : await prisma.inboxConnection.create({
          data: {
            ...common,
            workspaceId: oauthState.workspaceId,
            provider: 'GOOGLE',
            providerAccountId: accountId,
            encryptedRefreshToken: SecretCryptoService.encrypt(tokens.refresh_token!),
            syncCursor: profile.historyId,
          },
        });
    await InstitutionSelectionService.replace(oauthState.workspaceId, connection.id, oauthState.institutionCodes);
    await this.consent.record(oauthState.profileId, connection.id, common.scopes);
    return { connection: serializeConnection(connection), returnTo: oauthState.returnTo };
  }

  public callbackRedirect(returnTo: string, code?: string): string {
    const target = new URL(safeReturnTo(returnTo), config.appUrl);
    target.searchParams.set('gmail', code ? 'error' : 'connected');
    if (code) target.searchParams.set('code', code);
    return target.toString();
  }

  public list(workspaceId: string): Promise<Array<Record<string, unknown>>> {
    return this.reader.list(workspaceId);
  }

  public async disconnect(workspaceId: string, connectionId: string): Promise<void> {
    const connection = await prisma.inboxConnection.findFirst({ where: { id: connectionId, workspaceId, provider: 'GOOGLE' } });
    if (!connection) throw new AppError(404, 'INBOX_CONNECTION_NOT_FOUND', 'Gmail connection was not found.');
    const encryptedToken = connection.encryptedRefreshToken || connection.encryptedAccessToken;
    if (encryptedToken) await this.google.revoke(SecretCryptoService.decrypt(encryptedToken));
    await prisma.$transaction([
      prisma.bankConnection.updateMany({ where: { workspaceId, inboxConnectionId: connection.id }, data: { status: 'DISABLED' } }),
      prisma.inboxConnection.update({
        where: { id: connection.id },
        data: { status: 'REVOKED', encryptedAccessToken: null, encryptedRefreshToken: null, tokenExpiresAt: null, revokedAt: new Date() },
      }),
    ]);
    await this.consent.revoke(connection.id);
  }
}
