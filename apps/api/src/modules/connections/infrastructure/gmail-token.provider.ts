import type { InboxConnection } from '@prisma/client';
import { prisma } from '../../../config/database';
import { AppError } from '../../../errors/app-error';
import { SecretCryptoService } from '../../../shared/infrastructure/secret-crypto.service';
import { GoogleGmailClient } from './google/google-gmail.client';

export interface GmailAccess {
  connection: InboxConnection;
  accessToken: string;
}

export class GmailTokenProvider {
  public constructor(private readonly google: GoogleGmailClient) {}

  public async accessToken(connectionId: string, workspaceId: string): Promise<GmailAccess> {
    const connection = await prisma.inboxConnection.findFirst({
      where: { id: connectionId, workspaceId, provider: 'GOOGLE' },
    });
    if (!connection || connection.status === 'REVOKED') {
      throw new AppError(404, 'INBOX_CONNECTION_NOT_FOUND', 'Gmail connection was not found.');
    }
    if (
      connection.encryptedAccessToken
      && connection.tokenExpiresAt
      && connection.tokenExpiresAt.getTime() > Date.now() + 60_000
    ) {
      return { connection, accessToken: SecretCryptoService.decrypt(connection.encryptedAccessToken) };
    }
    if (!connection.encryptedRefreshToken) {
      await this.markReauthenticationRequired(connection.id, 'GOOGLE_REFRESH_TOKEN_MISSING');
      throw new AppError(401, 'GOOGLE_REAUTH_REQUIRED', 'Reconnect Gmail to continue syncing.');
    }

    try {
      const tokens = await this.google.refreshToken(SecretCryptoService.decrypt(connection.encryptedRefreshToken));
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
    } catch (error) {
      await this.markReauthenticationRequired(connection.id, 'GOOGLE_REFRESH_FAILED');
      throw error instanceof AppError
        ? error
        : new AppError(401, 'GOOGLE_REAUTH_REQUIRED', 'Reconnect Gmail to continue syncing.');
    }
  }

  private async markReauthenticationRequired(connectionId: string, errorCode: string): Promise<void> {
    await prisma.inboxConnection.update({
      where: { id: connectionId },
      data: { status: 'REAUTH_REQUIRED', lastErrorCode: errorCode },
    });
  }
}
