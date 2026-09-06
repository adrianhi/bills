import { useEffect } from 'react';
import type { RecordProductViewInput } from '@/entities/engagement';
import { engagementService } from '@/entities/engagement';

export function useTrackProductView(input: RecordProductViewInput | null) {
  const name = input?.name;
  const contextKey = input?.contextKey;
  const currency = input?.properties?.currency;
  const status = input?.properties?.status;
  useEffect(() => {
    if (name && contextKey) void engagementService.recordView({
      name, contextKey, properties: { ...(currency ? { currency } : {}), ...(status ? { status } : {}) },
    }).catch(() => undefined);
  }, [name, contextKey, currency, status]);
}
