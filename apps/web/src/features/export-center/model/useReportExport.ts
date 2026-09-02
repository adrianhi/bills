import { useEffect, useMemo, useRef, useState } from 'react';
import { accountService } from '@/entities/account';
import { shareOrDownloadFile, supportsFileShare } from '@/shared/lib';
import { reportService } from '../api/report.service';
import { exportFormError, reportPeriodParams, type ExportFormState, type ReportPeriod } from './export-form';

export function useReportExport(open: boolean, state: ExportFormState, period: ReportPeriod) {
  const [working, setWorking] = useState(false);
  const [outcome, setOutcome] = useState<'shared' | 'downloaded' | null>(null);
  const [error, setError] = useState<unknown>(null);
  const pending = useRef(false);
  const canShare = useMemo(() => supportsFileShare(), []);
  useEffect(() => {
    if (!open) return;
    // oxlint-disable-next-line react/set-state-in-effect -- a reopened dialog starts a fresh result view
    setOutcome(null);
    setError(null);
  }, [open]);

  const handleExport = async () => {
    if (pending.current || exportFormError(state, period)) return;
    pending.current = true;
    setWorking(true); setError(null); setOutcome(null);
    try {
      const richFormat = state.format === 'pdf' || state.format === 'xlsx';
      const file = state.format === 'json'
        ? { blob: await accountService.exportData(), filename: `bills-cuenta-${new Date().toISOString().slice(0, 10)}.json` }
        : await reportService.financialExport({
          format: state.format, currency: state.currency, ...reportPeriodParams(period),
          institutionCodes: state.institutionCodes.length ? state.institutionCodes : undefined,
          category: state.category || undefined, status: state.status || undefined,
          transactionType: state.transactionType || undefined, search: state.search || undefined,
          includeNotes: state.includeNotes, title: richFormat && state.title.trim() ? state.title.trim() : undefined,
          sections: richFormat ? state.sections : undefined,
        });
      const title = state.format === 'json' ? 'Copia completa de mi cuenta bills.' : state.title.trim() || 'Informe financiero bills.';
      const result = await shareOrDownloadFile(file.blob, file.filename, title);
      setOutcome(result === 'cancelled' ? null : result);
    } catch (cause) {
      setError(cause);
    } finally {
      pending.current = false;
      setWorking(false);
    }
  };

  return { working, outcome, error, canShare, handleExport };
}
