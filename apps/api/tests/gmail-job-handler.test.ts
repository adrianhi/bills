import { describe, expect, it, vi } from 'vitest';
import { GmailJobHandlerRegistry } from '../src/modules/ingestion/application/gmail-job-handler.registry';
import type { GmailSyncOperations } from '../src/modules/connections';

function syncOperations(): GmailSyncOperations {
  return {
    syncFull: vi.fn().mockResolvedValue({ mode: 'full' }),
    syncBankBackfill: vi.fn().mockResolvedValue({ mode: 'bank' }),
    syncIncremental: vi.fn().mockResolvedValue({ mode: 'incremental' }),
    registerWatch: vi.fn().mockResolvedValue({ mode: 'watch' }),
    replayFailed: vi.fn().mockResolvedValue({ mode: 'replay' }),
  };
}

describe('Gmail job handler registry', () => {
  it('dispatches every job type to its synchronization strategy', async () => {
    const sync = syncOperations();
    const registry = new GmailJobHandlerRegistry(sync);
    const base = { workspaceId: 'workspace', inboxConnectionId: 'connection', payload: {} };

    await expect(registry.execute('GMAIL_INITIAL_BACKFILL', base)).resolves.toEqual({ mode: 'full' });
    await expect(registry.execute('GMAIL_HISTORY_SYNC', base)).resolves.toEqual({ mode: 'incremental' });
    await expect(registry.execute('GMAIL_RECONCILIATION', base)).resolves.toEqual({ mode: 'incremental' });
    await expect(registry.execute('GMAIL_WATCH_RENEWAL', base)).resolves.toEqual({ mode: 'watch' });
    await expect(registry.execute('GMAIL_FAILED_REPLAY', base)).resolves.toEqual({ mode: 'replay' });
    await expect(registry.execute('GMAIL_BANK_BACKFILL', {
      ...base,
      payload: { institutionCode: 'BHD' },
    })).resolves.toEqual({ mode: 'bank' });

    expect(sync.syncFull).toHaveBeenCalledWith('workspace', 'connection', true);
    expect(sync.syncBankBackfill).toHaveBeenCalledWith('workspace', 'connection', 'BHD');
  });

  it('rejects an incomplete bank backfill instead of calling Gmail', async () => {
    const registry = new GmailJobHandlerRegistry(syncOperations());
    await expect(registry.execute('GMAIL_BANK_BACKFILL', {
      workspaceId: 'workspace', inboxConnectionId: 'connection', payload: {},
    })).rejects.toMatchObject({ code: 'BANK_BACKFILL_INVALID' });
  });
});
