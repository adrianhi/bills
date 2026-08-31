import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./download-blob', () => ({ downloadBlob: vi.fn() }));

import { downloadBlob } from './download-blob';
import { canShareFiles, shareOrDownloadFile } from './share-file';

const blob = new Blob(['contenido'], { type: 'text/csv' });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('canShareFiles', () => {
  it('returns false when the browser cannot share files', () => {
    vi.stubGlobal('navigator', {});
    expect(canShareFiles(new File([blob], 'a.csv'))).toBe(false);
  });

  it('asks the browser whether the file is shareable', () => {
    const canShare = vi.fn().mockReturnValue(true);
    vi.stubGlobal('navigator', { share: vi.fn(), canShare });
    const file = new File([blob], 'a.csv');
    expect(canShareFiles(file)).toBe(true);
    expect(canShare).toHaveBeenCalledWith({ files: [file] });
  });
});

describe('shareOrDownloadFile', () => {
  it('shares through the Web Share API when files are supported', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share, canShare: vi.fn().mockReturnValue(true) });
    const outcome = await shareOrDownloadFile(blob, 'bills-informe.pdf', 'Informe');
    expect(outcome).toBe('shared');
    expect(share).toHaveBeenCalledOnce();
    expect(downloadBlob).not.toHaveBeenCalled();
  });

  it('reports cancellation without falling back to download', async () => {
    vi.stubGlobal('navigator', {
      share: vi.fn().mockRejectedValue(new DOMException('cancel', 'AbortError')),
      canShare: vi.fn().mockReturnValue(true),
    });
    const outcome = await shareOrDownloadFile(blob, 'bills-informe.pdf', 'Informe');
    expect(outcome).toBe('cancelled');
    expect(downloadBlob).not.toHaveBeenCalled();
  });

  it('falls back to download when sharing is unavailable', async () => {
    vi.stubGlobal('navigator', {});
    const outcome = await shareOrDownloadFile(blob, 'bills-informe.pdf', 'Informe');
    expect(outcome).toBe('downloaded');
    expect(downloadBlob).toHaveBeenCalledWith(blob, 'bills-informe.pdf');
  });

  it('falls back to download when the share dialog fails for other reasons', async () => {
    vi.stubGlobal('navigator', {
      share: vi.fn().mockRejectedValue(new Error('not allowed')),
      canShare: vi.fn().mockReturnValue(true),
    });
    const outcome = await shareOrDownloadFile(blob, 'bills-informe.pdf', 'Informe');
    expect(outcome).toBe('downloaded');
    expect(downloadBlob).toHaveBeenCalledWith(blob, 'bills-informe.pdf');
  });
});
