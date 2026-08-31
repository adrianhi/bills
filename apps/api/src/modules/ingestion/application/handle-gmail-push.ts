import { AppError } from '../../../errors/app-error';
import { decodeGmailPush } from '../providers/google/gmail-push';
import type { IngestionJobQueue } from './ingestion-job.port';

interface OidcVerifier {
  verify(token: string): Promise<unknown>;
}

interface InboxConnectionLookup {
  findActiveGoogleByEmail(emailAddress: string): Promise<Array<{ workspaceId: string; id: string }>>;
}

export class HandleGmailPush {
  constructor(
    private readonly oidc: OidcVerifier,
    private readonly connections: InboxConnectionLookup,
    private readonly jobs: IngestionJobQueue
  ) {}
  async execute(authorization: string, body: unknown) {
    const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) throw new AppError(401, 'GOOGLE_PUSH_TOKEN_MISSING', 'Google push token is missing.');
    await this.oidc.verify(token);
    const push = decodeGmailPush(body);
    const connections = await this.connections.findActiveGoogleByEmail(push.emailAddress);
    await Promise.all(connections.map((connection) =>
      this.jobs.enqueuePush(connection.workspaceId, connection.id, push.messageId, push.historyId)
    ));
  }
}
