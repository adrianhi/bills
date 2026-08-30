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
  const [newBankSelection, setNewBankSelection] = useState<string[]>([]);
  const [bankSelections, setBankSelections] = useState<Record<string, string[]>>({});
  const query = useQuery({
    queryKey: ['inbox-connections'], queryFn: async ({ signal }) => {
      const [connections, institutions] = await Promise.all([
        connectionService.listInboxConnections(signal), connectionService.listInstitutions(signal),
      ]);
      return { connections, institutions };
    },
    enabled: isOpen && authenticated,
    refetchInterval: (currentQuery) => {
      if (!isOpen) return false;
      const connections = currentQuery.state.data?.connections ?? [];
      return connections.some((item) => item.currentJob?.status === 'PENDING' || item.currentJob?.status === 'PROCESSING')
        ? 2_500
        : false;
    },
  });
  useEffect(() => {
    if (isOpen && searchParams.has('gmail')) setSearchParams({}, { replace: true });
  }, [isOpen, searchParams, setSearchParams]);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['inbox-connections'] });
  const google = useMutation({
    mutationFn: (institutionCodes: string[]) => connectionService.startGoogle('/app/mas?settings=connections', institutionCodes),
    onSuccess: ({ authorizationUrl }) => window.location.assign(authorizationUrl),
  });
  const selectionMutation = useMutation({
    mutationFn: ({ id, codes }: { id: string; codes: string[] }) => connectionService.updateInstitutions(id, codes),
    onSuccess: async () => { setNotice('Selección guardada. Los bancos nuevos se importarán en segundo plano.'); await refresh(); },
  });
  const syncMutation = useMutation({ mutationFn: connectionService.sync, onSuccess: async () => { setNotice('Sincronización en cola; continuará en segundo plano.'); await refresh(); } });
  const disconnectMutation = useMutation({ mutationFn: connectionService.disconnect, onSuccess: refresh });
  const exportMutation = useMutation({ mutationFn: accountService.exportData, onSuccess: (blob) => downloadBlob(blob, `bills-account-export-${new Date().toISOString().slice(0, 10)}.json`) });
  const deleteMutation = useMutation({ mutationFn: accountService.deleteAccount, onSuccess: onAccountDeleted });
  const error = query.error || google.error || selectionMutation.error || syncMutation.error || disconnectMutation.error || exportMutation.error || deleteMutation.error;
  const busy = google.isPending ? 'google' : syncMutation.isPending ? `sync:${syncMutation.variables ?? ''}` :
    selectionMutation.isPending ? `selection:${selectionMutation.variables?.id ?? ''}` :
    disconnectMutation.isPending ? `disconnect:${disconnectMutation.variables ?? ''}` : exportMutation.isPending ? 'export' : deleteMutation.isPending ? 'delete' : '';
  return {
    connections: query.data?.connections ?? [], institutions: query.data?.institutions ?? [],
    newBankSelection, setNewBankSelection, bankSelections,
    setBankSelection: (id: string, codes: string[]) => setBankSelections((current) => ({ ...current, [id]: codes })),
    confirmation, setConfirmation, notice, error: error?.message ?? '', busy,
    startGoogle: (codes = newBankSelection) => google.mutate(codes),
    saveSelection: (id: string) => selectionMutation.mutate({
      id,
      codes: bankSelections[id] ?? query.data?.connections.find((connection) => connection.id === id)?.selectedInstitutionCodes ?? [],
    }),
    sync: (id: string) => syncMutation.mutate(id),
    disconnect: (id: string) => disconnectMutation.mutate(id), exportData: () => exportMutation.mutate(),
    deleteAccount: () => deleteMutation.mutate(),
  };
}
