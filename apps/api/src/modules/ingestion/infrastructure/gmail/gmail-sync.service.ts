import { config } from '../../../../config';
import { prisma } from '../../../../config/database';
import type { GmailReplayFilters, GmailSyncOperations } from '../../../connections';
import { GmailQueryService } from '../../../connections/infrastructure/gmail-query.service';
import { GmailTokenProvider } from '../../../connections/infrastructure/gmail-token.provider';
import { GoogleGmailClient } from '../../../connections/infrastructure/google/google-gmail.client';
import { emptySyncSummary } from '../../../connections/infrastructure/google/gmail-types';
import { InstitutionSelectionService } from '../../../connections/infrastructure/institution-selection.service';
import { GmailMessageProcessor } from './gmail-message.processor';
import { restoreRetainedEmail } from './retained-email';

export class GmailSyncService implements GmailSyncOperations {
  public constructor(
    private readonly google: GoogleGmailClient,
    private readonly tokens: GmailTokenProvider,
    private readonly queries: GmailQueryService,
    private readonly messages: GmailMessageProcessor
  ) {}

  public async syncFull(workspaceId: string, connectionId: string, initial = false) {
    const { connection, accessToken } = await this.tokens.accessToken(connectionId, workspaceId);
    const query = await this.queries.senderQuery(
      connection.id,
      initial ? null : connection.lastSuccessfulSyncAt || connection.lastSyncedAt
    );
    const summary = emptySyncSummary();
    let pageToken = '';
    do {
      const page = await this.google.listMessages(accessToken, query, pageToken);
      await this.messages.processIds(
        workspaceId, connection, accessToken, (page.messages || []).map((message) => message.id), summary
      );
      pageToken = page.nextPageToken || '';
    } while (pageToken);
    const profile = await this.google.profile(accessToken);
    await this.queries.finishSync(connection.id, profile.historyId || connection.syncCursor, summary);
    return summary;
  }

  public async syncBankBackfill(workspaceId: string, connectionId: string, institutionCode: string) {
    const code = institutionCode.trim().toUpperCase();
    const { connection, accessToken } = await this.tokens.accessToken(connectionId, workspaceId);
    const query = await this.queries.senderQuery(connection.id, null, [code]);
    const summary = emptySyncSummary();
    let pageToken = '';
    do {
      const selected = await InstitutionSelectionService.enabledCodes(connection.id);
      if (!selected.includes(code)) break;
      const page = await this.google.listMessages(accessToken, query, pageToken);
      await this.messages.processIds(
        workspaceId,
        connection,
        accessToken,
        (page.messages || []).map((message) => message.id),
        summary,
        config.gmailBackfillConcurrency,
        code
      );
      pageToken = page.nextPageToken || '';
    } while (pageToken);
    return summary;
  }

  public async syncIncremental(workspaceId: string, connectionId: string) {
    const { connection, accessToken } = await this.tokens.accessToken(connectionId, workspaceId);
    if (!connection.syncCursor) return this.syncFull(workspaceId, connectionId, false);
    const summary = emptySyncSummary();
    const messageIds = new Set<string>();
    let pageToken = '';
    let finalHistoryId = connection.syncCursor;
    do {
      const page = await this.google.history(accessToken, connection.syncCursor, pageToken);
      if (!page) return this.syncFull(workspaceId, connectionId, false);
      for (const history of page.history || []) {
        for (const added of history.messagesAdded || []) {
          if (added.message?.id) messageIds.add(added.message.id);
        }
      }
      finalHistoryId = page.historyId || finalHistoryId;
      pageToken = page.nextPageToken || '';
    } while (pageToken);
    const supportedQuery = await this.queries.senderQuery(connection.id, new Date());
    const senderTerms = Array.from(supportedQuery.matchAll(/from:([^\s}]+)/g)).map((match) => match[1]);
    const supportedIds: string[] = [];
    for (const messageId of messageIds) {
      const metadata = await this.google.message(accessToken, messageId, 'metadata');
      const from = (metadata.payload?.headers || [])
        .find((header) => header.name.toLowerCase() === 'from')?.value.toLowerCase() || '';
      if (senderTerms.some((sender) => from.includes(sender.replace(/^@/, '').toLowerCase()))) supportedIds.push(messageId);
    }
    await this.messages.processIds(workspaceId, connection, accessToken, supportedIds, summary);
    await this.queries.finishSync(connection.id, finalHistoryId, summary);
    return summary;
  }

  public async registerWatch(workspaceId: string, connectionId: string) {
    if (!config.googlePubSubTopic) return { enabled: false };
    const { connection, accessToken } = await this.tokens.accessToken(connectionId, workspaceId);
    const watch = await this.google.watch(accessToken, config.googlePubSubTopic);
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

  public async replayFailed(workspaceId: string, connectionId: string, filters: GmailReplayFilters = {}) {
    const { connection, accessToken } = await this.tokens.accessToken(connectionId, workspaceId);
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
    const summary = emptySyncSummary();
    summary.scanned = events.length;
    for (let index = 0; index < events.length; index += config.gmailSyncConcurrency) {
      const chunk = events.slice(index, index + config.gmailSyncConcurrency);
      await Promise.all(chunk.map(async (event) => {
        if (!event.providerEmailId) return;
        await this.messages.process({
          workspaceId,
          connection,
          accessToken,
          messageId: event.providerEmailId,
          summary,
          allowReplay: true,
          replayStatuses: filters.statuses?.includes('IGNORED')
            ? ['FAILED', 'PENDING', 'IGNORED']
            : ['FAILED', 'PENDING'],
          retainedEmail: restoreRetainedEmail(event),
        });
      }));
    }
    await this.queries.finishSync(connection.id, connection.syncCursor, summary);
    return summary;
  }
}
