import { AppError } from '../../../errors/app-error';
import { IngestionJobService } from '../../../services/ingestion-job.service';
import { PrismaInboxConnectionRepository } from '../infrastructure/prisma-inbox-connection.repository';
import { decodeGmailPush } from '../providers/google/gmail-push';
import { GoogleOidcAdapter } from '../providers/google/google-oidc.adapter';

export class HandleGmailPush {
  constructor(private readonly oidc: GoogleOidcAdapter, private readonly connections: PrismaInboxConnectionRepository) {}
  async execute(authorization: string, body: unknown) {
    const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) throw new AppError(401, 'GOOGLE_PUSH_TOKEN_MISSING', 'Google push token is missing.');
    await this.oidc.verify(token);
    const push = decodeGmailPush(body);
    const connections = await this.connections.findActiveGoogleByEmail(push.emailAddress);
    await Promise.all(connections.map((connection) => IngestionJobService.enqueuePush(connection.workspaceId, connection.id, push.messageId, push.historyId)));
  }
}
