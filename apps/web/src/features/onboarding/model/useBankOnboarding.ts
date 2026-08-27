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
  const [copied, setCopied] = useState(false);

  const query = useQuery({
    queryKey: ['onboarding-connections'],
    enabled: authenticated,
    queryFn: async ({ signal }) => {
      const [institutions, banks, inboxes] = await Promise.all([
        connectionService.listInstitutions(signal), connectionService.listBankConnections(signal),
        connectionService.listInboxConnections(signal),
      ]);
      return { institutions, banks, inboxes };
    },
  });

  useEffect(() => {
    const gmail = searchParams.get('gmail');
    if (!gmail) return;
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['onboarding-connections'] });
  const syncMutation = useMutation({ mutationFn: (connection: InboxConnection) => connectionService.sync(connection.id), onSuccess: async () => { setNotice('Sincronización en cola. Puedes seguir usando la aplicación.'); await invalidate(); } });
  const googleMutation = useMutation({
    mutationFn: () => connectionService.startGoogle('/onboarding'),
    onSuccess: ({ authorizationUrl }) => window.location.assign(authorizationUrl),
    onError: (error) => { if (error instanceof ApiClientError && error.code === 'GOOGLE_OAUTH_NOT_CONFIGURED') setGoogleUnavailable(true); },
  });
  const forwardingMutation = useMutation({ mutationFn: () => connectionService.createBankConnection('BHD'), onSuccess: invalidate });
  const completeMutation = useMutation({ mutationFn: accountService.completeOnboarding, onSuccess: onComplete });

  const bankConnection = query.data?.banks.find((item) => item.institution.code === 'BHD') ?? null;
  const forwardingAddress = bankConnection?.ingestionAddress
    ? `${bankConnection.ingestionAddress.aliasToken}@${bankConnection.ingestionAddress.domain}` : '';
  const activeInbox = query.data?.inboxes.find((item) => item.status === 'ACTIVE');
  const reconnectNeeded = query.data?.inboxes.some((item) => item.status === 'REAUTH_REQUIRED') ?? false;
  const error = useMemo(() => query.error || syncMutation.error || googleMutation.error || forwardingMutation.error || completeMutation.error,
    [query.error, syncMutation.error, googleMutation.error, forwardingMutation.error, completeMutation.error]);

  const copyAddress = async () => {
    if (!forwardingAddress) return;
    await navigator.clipboard.writeText(forwardingAddress);
    setCopied(true); window.setTimeout(() => setCopied(false), 1800);
  };

  return {
    institutions: query.data?.institutions ?? [], activeInbox, reconnectNeeded, forwardingAddress,
    loading: query.isLoading, busy: googleMutation.isPending ? 'google' : syncMutation.isPending ? 'sync' :
      forwardingMutation.isPending ? 'forwarding' : completeMutation.isPending ? 'complete' : null,
    error: oauthError || error?.message || '',
    notice, googleUnavailable, copied, copyAddress,
    connectGoogle: () => googleMutation.mutate(), sync: (connection: InboxConnection) => syncMutation.mutate(connection),
    createForwarding: () => forwardingMutation.mutate(), complete: () => completeMutation.mutate(),
  };
}
