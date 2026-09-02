import { config } from '../../../config';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';
import { AppError } from '../../../errors/app-error';
import { ParserRegistry } from '../../../ingestion/parser-registry';
import type { SyncSummary } from './google/gmail-types';
import { gmailInitialCutoff } from '../domain/gmail-sync-period';
import { InstitutionSelectionService } from './institution-selection.service';

export class GmailQueryService {
  public async senderQuery(
    inboxConnectionId: string,
    lastSyncedAt?: Date | null,
    onlyInstitutionCodes?: string[]
  ): Promise<string> {
    const selectedCodes = await InstitutionSelectionService.enabledCodes(inboxConnectionId);
    const requested = onlyInstitutionCodes?.length
      ? selectedCodes.filter((code) => onlyInstitutionCodes.includes(code))
      : selectedCodes;
    if (!requested.length) {
      throw new AppError(409, 'BANK_SELECTION_REQUIRED', 'Select at least one bank before synchronizing Gmail.');
    }
    const supported = ParserRegistry.supportedInstitutionCodes();
    const institutions = await prisma.financialInstitution.findMany({
      where: { code: { in: requested.filter((code) => supported.includes(code)) }, status: { in: ['PILOT', 'ACTIVE'] } },
      select: { senderPatterns: true },
    });
    const senders = Array.from(new Set(institutions.flatMap((item) => item.senderPatterns)))
      .map((pattern) => pattern.trim().toLowerCase())
      .filter(Boolean)
      .map((pattern) => `from:${pattern.startsWith('@') ? pattern.slice(1) : pattern}`);
    if (!senders.length) {
      throw new AppError(503, 'BANK_SENDERS_NOT_CONFIGURED', 'No supported bank senders are configured.');
    }
    const cutoff = gmailInitialCutoff(new Date(), config.gmailInitialSyncMonths);
    const dateFilter = lastSyncedAt
      ? `after:${Math.floor((lastSyncedAt.getTime() - 5 * 60 * 1000) / 1000)}`
      : `after:${Math.floor(cutoff.getTime() / 1000)}`;
    return `{${senders.join(' ')}} ${dateFilter}`;
  }

  public async finishSync(connectionId: string, cursor: string | null | undefined, summary: SyncSummary): Promise<void> {
    const now = new Date();
    await prisma.inboxConnection.update({
      where: { id: connectionId },
      data: {
        status: 'ACTIVE',
        ...(cursor ? { syncCursor: cursor } : {}),
        lastSyncedAt: now,
        lastSuccessfulSyncAt: now,
        lastSyncSummary: summary as unknown as Prisma.InputJsonValue,
        lastErrorCode: summary.failed > 0 ? 'PARTIAL_SYNC_FAILURE' : null,
        syncLeaseUntil: null,
        nextReconcileAt: new Date(now.getTime() + config.gmailReconcileIntervalMinutes * 60_000),
      },
    });
  }
}
