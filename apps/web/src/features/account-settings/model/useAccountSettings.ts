import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { accountService } from '@/entities/account/api/account.service';
import { connectionService } from '@/entities/connection/api/connection.service';
import { downloadBlob } from '@/shared/lib';

export function useAccountSettings(isOpen: boolean, authenticated: boolean, onAccountDeleted: () => void) {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [confirmation, setConfirmation] = useState('');
  const [notice, setNotice] = useState('');
  const query = useQuery({
    queryKey: ['inbox-connections'], queryFn: ({ signal }) => connectionService.listInboxConnections(signal),
    enabled: isOpen && authenticated, refetchInterval: isOpen ? 30_000 : false,
  });
  useEffect(() => {
    if (isOpen && searchParams.has('gmail')) setSearchParams({}, { replace: true });
  }, [isOpen, searchParams, setSearchParams]);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['inbox-connections'] });
  const google = useMutation({ mutationFn: () => connectionService.startGoogle('/?settings=connections'), onSuccess: ({ authorizationUrl }) => window.location.assign(authorizationUrl) });
  const syncMutation = useMutation({ mutationFn: connectionService.sync, onSuccess: async () => { setNotice('Sincronización en cola; continuará en segundo plano.'); await refresh(); } });
  const disconnectMutation = useMutation({ mutationFn: connectionService.disconnect, onSuccess: refresh });
  const exportMutation = useMutation({ mutationFn: accountService.exportData, onSuccess: (blob) => downloadBlob(blob, `bills-account-export-${new Date().toISOString().slice(0, 10)}.json`) });
  const deleteMutation = useMutation({ mutationFn: accountService.deleteAccount, onSuccess: onAccountDeleted });
  const error = query.error || google.error || syncMutation.error || disconnectMutation.error || exportMutation.error || deleteMutation.error;
  const busy = google.isPending ? 'google' : syncMutation.isPending ? `sync:${syncMutation.variables ?? ''}` :
    disconnectMutation.isPending ? `disconnect:${disconnectMutation.variables ?? ''}` : exportMutation.isPending ? 'export' : deleteMutation.isPending ? 'delete' : '';
  return {
    connections: query.data ?? [], confirmation, setConfirmation, notice, error: error?.message ?? '', busy,
    startGoogle: () => google.mutate(), sync: (id: string) => syncMutation.mutate(id),
    disconnect: (id: string) => disconnectMutation.mutate(id), exportData: () => exportMutation.mutate(),
    deleteAccount: () => deleteMutation.mutate(),
  };
}
