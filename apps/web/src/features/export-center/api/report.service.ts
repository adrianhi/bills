import { httpClient } from '@/shared/api';

export type FinancialReportFormat = 'csv' | 'xlsx' | 'pdf';
export type FinancialReportSection = 'summary' | 'comparison' | 'categories' | 'merchants' | 'movements';

export interface FinancialReportParams {
  format: FinancialReportFormat;
  currency: string;
  month?: string;
  startDate?: string;
  endDate?: string;
  category?: string;
  status?: string;
  organization?: string;
  institutionCodes?: string[];
  transactionType?: string;
  search?: string;
  includeNotes?: boolean;
  title?: string;
  sections?: FinancialReportSection[];
}

export interface FinancialReportFile {
  blob: Blob;
  filename: string;
}

function compactParams(params: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== '' && value !== false));
}

export function filenameFromDisposition(disposition: string | undefined, fallback: string): string {
  if (!disposition) return fallback;
  const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(disposition);
  return match?.[1] ? decodeURIComponent(match[1].replace(/"/g, '')) : fallback;
}

export const reportService = {
  async financialExport(params: FinancialReportParams): Promise<FinancialReportFile> {
    const { format, includeNotes, institutionCodes, sections, ...filters } = params;
    const response = await httpClient.get<Blob>('/reports/financial-export', {
      params: compactParams({
        ...filters,
        format,
        institutionCodes: institutionCodes?.length ? institutionCodes.join(',') : undefined,
        sections: sections?.length ? sections.join(',') : undefined,
        includeNotes: includeNotes ? 'true' : undefined,
      }),
      responseType: 'blob',
    });
    const period = filters.month || `${filters.startDate ?? 'inicio'}-${filters.endDate ?? 'hoy'}`;
    return {
      blob: response.data,
      filename: filenameFromDisposition(response.headers['content-disposition'], `bills-informe-${period}.${format}`),
    };
  },
};
