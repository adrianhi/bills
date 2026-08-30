import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { accountService } from '@/entities/account/api/account.service';
import { connectionService, type InboxConnection } from '@/entities/connection/api/connection.service';
import { ApiClientError } from '@/shared/api';

export function useBankOnboarding(authenticated: boolean, onComplete: () => void) {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [notice, setNotice] = useState(() => searchParams.get('gmail') === 'connected' ? 'Gmail conectado. Estamos importando tus movimientos en segundo plano.' : '');
  const [oauthError] = useState(() => searchParams.get('gmail') === 'error' ? 'Google no pudo completar la conexión.' : '');
  const [googleUnavailable, setGoogleUnavailable] = useState(false);
  const [selectionDraft, setSelectionDraft] = useState<string[]>([]);
  const [selectionOwner, setSelectionOwner] = useState('');

  const query = useQuery({
    queryKey: ['onboarding-connections'],
    enabled: authenticated,
    queryFn: async ({ signal }) => {
      const [institutions, inboxes] = await Promise.all([
        connectionService.listInstitutions(signal), connectionService.listInboxConnections(signal),
      ]);
      return { institutions, inboxes };
    },
    refetchInterval: (currentQuery) => {
      const inboxes = currentQuery.state.data?.inboxes ?? [];
      return inboxes.some((item) => item.currentJob?.status === 'PENDING' || item.currentJob?.status === 'PROCESSING')
        ? 2_500
        : false;
    },
  });

  useEffect(() => {
    const gmail = searchParams.get('gmail');
    if (!gmail) return;
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['onboarding-connections'] });
  const activeInbox = query.data?.inboxes.find((item) => item.status === 'ACTIVE');
  const selectedInstitutionCodes = activeInbox && selectionOwner !== activeInbox.id
    ? activeInbox.selectedInstitutionCodes
    : selectionDraft;
  const setSelectedInstitutionCodes = (codes: string[]) => {
    setSelectionDraft(codes);
    if (activeInbox) setSelectionOwner(activeInbox.id);
  };
  const syncMutation = useMutation({ mutationFn: (connection: InboxConnection) => connectionService.sync(connection.id), onSuccess: async () => { setNotice('Sincronización en cola. Puedes seguir usando la aplicación.'); await invalidate(); } });
  const googleMutation = useMutation({
    mutationFn: () => connectionService.startGoogle('/onboarding', selectedInstitutionCodes),
    onSuccess: ({ authorizationUrl }) => window.location.assign(authorizationUrl),
    onError: (error) => { if (error instanceof ApiClientError && error.code === 'GOOGLE_OAUTH_NOT_CONFIGURED') setGoogleUnavailable(true); },
  });
  const selectionMutation = useMutation({
    mutationFn: () => connectionService.updateInstitutions(activeInbox!.id, selectedInstitutionCodes),
    onSuccess: async () => { setNotice('Bancos guardados. Importaremos el mes actual y el anterior.'); await invalidate(); },
  });
  const completeMutation = useMutation({ mutationFn: accountService.completeOnboarding, onSuccess: onComplete });

  const reconnectNeeded = query.data?.inboxes.some((item) => item.status === 'REAUTH_REQUIRED' || item.status === 'ERROR' || item.status === 'REVOKED') ?? false;
  const syncState = activeInbox?.currentJob?.status ?? null;
  const isSyncing = syncState === 'PENDING' || syncState === 'PROCESSING';
  const error = useMemo(() => query.error || syncMutation.error || googleMutation.error || selectionMutation.error || completeMutation.error,
    [query.error, syncMutation.error, googleMutation.error, selectionMutation.error, completeMutation.error]);

  return {
    institutions: query.data?.institutions ?? [], activeInbox, reconnectNeeded,
    selectedInstitutionCodes, setSelectedInstitutionCodes,
    syncState, isSyncing,
    loading: query.isLoading, busy: googleMutation.isPending ? 'google' : syncMutation.isPending ? 'sync' :
      selectionMutation.isPending ? 'selection' : completeMutation.isPending ? 'complete' : null,
    error: oauthError || error?.message || '',
    notice, googleUnavailable,
    connectGoogle: () => googleMutation.mutate(), sync: (connection: InboxConnection) => syncMutation.mutate(connection),
    saveSelection: () => selectionMutation.mutate(), complete: () => completeMutation.mutate(),
  };
}
