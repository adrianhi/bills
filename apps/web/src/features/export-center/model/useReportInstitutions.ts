import { useEffect, useState } from 'react';
import { connectionService, type Institution } from '@/entities/connection';

const CASH_INSTITUTION: Institution = {
  code: 'CASH', displayName: 'Manual / Efectivo', status: 'ACTIVE', selectable: true,
};

// Only institutions supported for transactions and ingestion
const SUPPORTED_CODES = new Set(['BHD', 'BANRESERVAS', 'POPULAR', 'QIK', 'CASH']);

export function useReportInstitutions(open: boolean) {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [failed, setFailed] = useState(false);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const controller = new AbortController();
    connectionService.listInstitutions(controller.signal)
      .then((items) => {
        const supported = items.filter((item) =>
          SUPPORTED_CODES.has(item.code.toUpperCase()) && item.status !== 'DISABLED' && item.status !== 'COMING_SOON'
        );
        const order = ['BHD', 'BANRESERVAS', 'POPULAR', 'QIK'];
        supported.sort((a, b) => order.indexOf(a.code.toUpperCase()) - order.indexOf(b.code.toUpperCase()));
        setInstitutions([...supported, CASH_INSTITUTION]);
        setFailed(false);
        setResolved(true);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setInstitutions([
            { code: 'BHD', displayName: 'Banco BHD', status: 'PILOT', selectable: true },
            { code: 'BANRESERVAS', displayName: 'Banreservas', status: 'PILOT', selectable: true },
            { code: 'POPULAR', displayName: 'Banco Popular', status: 'PILOT', selectable: true },
            { code: 'QIK', displayName: 'Qik Banco Digital', status: 'PILOT', selectable: true },
            CASH_INSTITUTION,
          ]);
          setFailed(true);
          setResolved(true);
        }
      });
    return () => controller.abort();
  }, [open]);

  return { institutions, loading: open && !resolved, failed };
}
