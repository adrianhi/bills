import { describe, expect, it, vi } from 'vitest';
import { TransactionApplicationService } from '../src/modules/transactions';
import type { TransactionReader, TransactionWriter } from '../src/modules/transactions/application/transaction-store.port';

function services() {
  const writer = {
    create: vi.fn(), update: vi.fn(), remove: vi.fn(),
  } as unknown as TransactionWriter;
  const reader = {
    list: vi.fn(), get: vi.fn(), export: vi.fn(),
  } as unknown as TransactionReader;
  return { writer, reader, service: new TransactionApplicationService(writer, reader) };
}

describe('transaction application service', () => {
  it('summarizes batch results without persistence knowledge', async () => {
    const { writer, service } = services();
    vi.mocked(writer.create)
      .mockResolvedValueOnce({ isDuplicate: false, transaction: {} as never })
      .mockResolvedValueOnce({ isDuplicate: true, transaction: {} as never });
    const result = await service.batchCreate('workspace', [{}, {}] as never);
    expect(result).toMatchObject({ total: 2, createdCount: 1, duplicateCount: 1 });
  });

  it('translates missing records into the stable public error', async () => {
    const { reader, writer, service } = services();
    vi.mocked(reader.get).mockResolvedValue(null);
    vi.mocked(writer.update).mockResolvedValue(null);
    vi.mocked(writer.remove).mockResolvedValue(0);
    await expect(service.get('workspace', 'missing')).rejects.toMatchObject({ code: 'RESOURCE_NOT_FOUND' });
    await expect(service.update('workspace', 'missing', {})).rejects.toMatchObject({ code: 'RESOURCE_NOT_FOUND' });
    await expect(service.remove('workspace', 'missing')).rejects.toMatchObject({ code: 'RESOURCE_NOT_FOUND' });
  });
});
