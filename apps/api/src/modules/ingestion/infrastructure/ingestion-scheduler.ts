import { config } from '../../../config';
import { prisma } from '../../../config/database';
import type { EnqueueJobInput } from '../application/ingestion-job.port';

function timeBucket(date: Date, minutes: number): number {
  return Math.floor(date.getTime() / (minutes * 60_000));
}

export class IngestionScheduler {
  public constructor(private readonly enqueue: (input: EnqueueJobInput) => Promise<unknown>) {}

  public async scheduleDue(now = new Date()): Promise<void> {
    const connections = await prisma.inboxConnection.findMany({
      where: { provider: 'GOOGLE', status: 'ACTIVE' },
      select: {
        id: true,
        workspaceId: true,
        nextReconcileAt: true,
        watchExpiresAt: true,
        _count: {
          select: {
            ingestionEvents: { where: { provider: 'GOOGLE_GMAIL', status: 'FAILED' } },
            institutionSubscriptions: { where: { enabled: true } },
          },
        },
      },
    });
    for (const connection of connections) {
      if (connection._count.institutionSubscriptions === 0) continue;
      if (!connection.nextReconcileAt || connection.nextReconcileAt <= now) {
        await this.enqueue({
          workspaceId: connection.workspaceId,
          inboxConnectionId: connection.id,
          type: 'GMAIL_RECONCILIATION',
          dedupeKey: `gmail-reconcile:${connection.id}:${timeBucket(now, config.gmailReconcileIntervalMinutes)}`,
        });
        await prisma.inboxConnection.update({
          where: { id: connection.id },
          data: { nextReconcileAt: new Date(now.getTime() + config.gmailReconcileIntervalMinutes * 60_000) },
        });
      }
      const threshold = new Date(now.getTime() + config.gmailWatchRenewalHours * 60 * 60_000);
      if (config.googlePubSubTopic && (!connection.watchExpiresAt || connection.watchExpiresAt <= threshold)) {
        await this.enqueue({
          workspaceId: connection.workspaceId,
          inboxConnectionId: connection.id,
          type: 'GMAIL_WATCH_RENEWAL',
          dedupeKey: `gmail-watch:${connection.id}:${timeBucket(now, 24 * 60)}`,
        });
      }
      if (connection._count.ingestionEvents > 0) {
        await this.enqueue({
          workspaceId: connection.workspaceId,
          inboxConnectionId: connection.id,
          type: 'GMAIL_FAILED_REPLAY',
          dedupeKey: `gmail-replay:${connection.id}:${timeBucket(now, 24 * 60)}`,
        });
      }
    }
  }
}
