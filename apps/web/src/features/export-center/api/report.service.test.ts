import { afterEach, describe, expect, it } from 'vitest';
import AxiosMockAdapter from 'axios-mock-adapter';
import { httpClient } from '@/shared/api';
import { filenameFromDisposition, reportService } from './report.service';

const mock = new AxiosMockAdapter(httpClient);

afterEach(() => mock.reset());

describe('reportService.financialExport', () => {
  it('requests the report with the selected period, currency and filters', async () => {
    let captured: Record<string, unknown> = {};
    mock.onGet('/reports/financial-export').reply((config) => {
      captured = config.params as Record<string, unknown>;
      return [200, new Blob(['data']), { 'content-disposition': 'attachment; filename="bills-informe-2026-08.xlsx"' }];
    });
    const result = await reportService.financialExport({
      format: 'xlsx', currency: 'USD', month: '2026-08', category: 'Supermercado', includeNotes: true,
    });
    expect(captured).toMatchObject({ format: 'xlsx', currency: 'USD', month: '2026-08', category: 'Supermercado', includeNotes: 'true' });
    expect(result.filename).toBe('bills-informe-2026-08.xlsx');
    expect(result.blob).toBeInstanceOf(Blob);
  });

  it('omits includeNotes when it is disabled and empty filters', async () => {
    let captured: Record<string, unknown> = {};
    mock.onGet('/reports/financial-export').reply((config) => {
      captured = config.params as Record<string, unknown>;
      return [200, new Blob(['data'])];
    });
    await reportService.financialExport({ format: 'csv', currency: 'DOP', startDate: '2026-08-01', endDate: '2026-08-15' });
    expect(captured.includeNotes).toBeUndefined();
    expect(captured.category).toBeUndefined();
    expect(captured).toMatchObject({ format: 'csv', currency: 'DOP', startDate: '2026-08-01', endDate: '2026-08-15' });
  });

  it('falls back to a generated filename when the header is missing', async () => {
    mock.onGet('/reports/financial-export').reply(200, new Blob(['data']));
    const result = await reportService.financialExport({ format: 'pdf', currency: 'DOP', month: '2026-08' });
    expect(result.filename).toBe('bills-informe-2026-08.pdf');
  });
});

describe('filenameFromDisposition', () => {
  it('parses quoted filenames', () => {
    expect(filenameFromDisposition('attachment; filename="bills-informe-2026-08.pdf"', 'fallback.pdf')).toBe('bills-informe-2026-08.pdf');
  });
  it('returns the fallback when the header is missing or malformed', () => {
    expect(filenameFromDisposition(undefined, 'fallback.pdf')).toBe('fallback.pdf');
    expect(filenameFromDisposition('attachment', 'fallback.pdf')).toBe('fallback.pdf');
  });
});
