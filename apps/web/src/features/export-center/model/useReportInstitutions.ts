import { useEffect, useState } from 'react';
import { connectionService, type Institution } from '@/entities/connection';

const CASH_INSTITUTION: Institution = {
  code: 'CASH', displayName: 'Manual / Efectivo', status: 'ACTIVE', selectable: true,
};

export function useReportInstitutions(open: boolean) {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [failed, setFailed] = useState(false);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const controller = new AbortController();
    connectionService.listInstitutions(controller.signal)
      .then((items) => {
        setInstitutions([...items.filter((item) => item.status !== 'DISABLED'), CASH_INSTITUTION]);
        setFailed(false); setResolved(true);
      })
      .catch(() => {
        if (!controller.signal.aborted) { setInstitutions([CASH_INSTITUTION]); setFailed(true); setResolved(true); }
      });
    return () => controller.abort();
  }, [open]);

  return { institutions, loading: open && !resolved, failed };
}
