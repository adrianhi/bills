import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, Building2, Check, Clipboard, ExternalLink, Inbox, Loader2, LogOut, Mail, RefreshCw, Send, Sparkles } from 'lucide-react';
import { Button, Card, CardContent, Input } from '@/shared/ui';

interface Institution {
  code: string;
  displayName: string;
  status: 'PILOT' | 'ACTIVE' | 'COMING_SOON' | 'DISABLED';
}

interface BankConnection {
  id: string;
  institution: Institution;
  ingestionAddress?: { aliasToken: string; domain: string } | null;
}

interface InboxConnection {
  id: string;
  email: string;
  status: 'ACTIVE' | 'REAUTH_REQUIRED' | 'ERROR' | 'REVOKED';
}

interface SyncSummary {
  scanned: number;
  parsed: number;
  created: number;
}

interface BankOnboardingProps {
  authToken: string;
  onComplete: () => void;
  onLogout: () => void;
}

export function BankOnboarding({ authToken, onComplete, onLogout }: BankOnboardingProps) {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [bankConnection, setBankConnection] = useState<BankConnection | null>(null);
  const [inboxConnections, setInboxConnections] = useState<InboxConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'google' | 'sync' | 'forwarding' | 'complete' | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [googleUnavailable, setGoogleUnavailable] = useState(false);
  const [summary, setSummary] = useState<SyncSummary | null>(null);

  const headers = useMemo(
    () => ({ Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' }),
    [authToken]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [institutionsResponse, bankResponse, inboxResponse] = await Promise.all([
        fetch('/api/v1/financial-institutions', { headers }),
        fetch('/api/v1/bank-connections', { headers }),
        fetch('/api/v1/inbox-connections', { headers }),
      ]);
      if (!institutionsResponse.ok || !bankResponse.ok || !inboxResponse.ok) {
        const body = await inboxResponse.json().catch(() => null);
        throw new Error(body?.error?.message || 'No pudimos cargar tus conexiones.');
      }
      const [institutionBody, bankBody, inboxBody] = await Promise.all([
        institutionsResponse.json(), bankResponse.json(), inboxResponse.json(),
      ]);
      setInstitutions(institutionBody.data || []);
      setBankConnection((bankBody.data || []).find((item: BankConnection) => item.institution?.code === 'BHD') || null);
      setInboxConnections(inboxBody.data || []);
      return (inboxBody.data || []) as InboxConnection[];
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos cargar tus conexiones.');
      return [];
    } finally {
      setLoading(false);
    }
  }, [headers]);

  const sync = useCallback(async (connection: InboxConnection) => {
    setBusy('sync');
    setError('');
    try {
      const response = await fetch(`/api/v1/inbox-connections/${connection.id}/sync`, { method: 'POST', headers });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message || 'No pudimos sincronizar Gmail.');
      setSummary(body.data);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos sincronizar Gmail.');
    } finally {
      setBusy(null);
    }
  }, [headers, load]);

  useEffect(() => {
    let active = true;
    void load().then((connections) => {
      if (!active) return;
      const query = new URLSearchParams(window.location.search);
      if (query.get('gmail') === 'connected') {
        window.history.replaceState({}, '', '/onboarding');
        const connected = connections.find((item) => item.status === 'ACTIVE');
        if (connected) void sync(connected);
      } else if (query.get('gmail') === 'error') {
        setError('Google no pudo completar la conexión. Puedes intentarlo otra vez o usar reenvío.');
        window.history.replaceState({}, '', '/onboarding');
      }
    });
    return () => { active = false; };
  }, [load, sync]);

  const connectGoogle = async () => {
    setBusy('google');
    setError('');
    try {
      const response = await fetch('/api/v1/inbox-connections/google/start', {
        method: 'POST', headers, body: JSON.stringify({ returnTo: '/onboarding' }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        if (body?.error?.code === 'GOOGLE_OAUTH_NOT_CONFIGURED') setGoogleUnavailable(true);
        throw new Error(body?.error?.message || 'No se pudo iniciar la conexión con Google.');
      }
      window.location.assign(body.data.authorizationUrl);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo iniciar la conexión con Google.');
      setBusy(null);
    }
  };

  const createForwarding = async () => {
    setBusy('forwarding');
    setError('');
    try {
      const response = await fetch('/api/v1/bank-connections', {
        method: 'POST', headers, body: JSON.stringify({ institutionCode: 'BHD' }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message || 'No se pudo crear la dirección.');
      setBankConnection(body.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo crear la dirección.');
    } finally {
      setBusy(null);
    }
  };

  const complete = async () => {
    setBusy('complete');
    setError('');
    try {
      const response = await fetch('/api/v1/me/onboarding/complete', { method: 'POST', headers });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message || 'No pudimos terminar la configuración.');
      onComplete();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos terminar la configuración.');
    } finally {
      setBusy(null);
    }
  };

  const forwardingAddress = bankConnection?.ingestionAddress
    ? `${bankConnection.ingestionAddress.aliasToken}@${bankConnection.ingestionAddress.domain}`
    : '';
  const activeInbox = inboxConnections.find((item) => item.status === 'ACTIVE');
  const reconnectNeeded = inboxConnections.some((item) => item.status === 'REAUTH_REQUIRED');

  const copyAddress = async () => {
    if (!forwardingAddress) return;
    await navigator.clipboard.writeText(forwardingAddress);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-xl font-black text-white shadow-lg shadow-emerald-500/20">b.</div>
            <div><p className="font-bold">Activa tus movimientos automáticos</p><p className="text-xs text-muted-foreground">Sin tocar tu banca en línea.</p></div>
          </div>
          <Button variant="ghost" size="sm" className="gap-2" onClick={onLogout}><LogOut className="h-4 w-4" /> Salir</Button>
        </div>

        <Card className="overflow-hidden border-border/60 shadow-xl">
          <div className="bg-gradient-to-br from-emerald-600 to-teal-600 p-6 text-white">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/15"><Sparkles className="h-6 w-6" /></div>
            <h1 className="text-2xl font-bold">Conecta tu correo y listo</h1>
            <p className="mt-2 max-w-lg text-sm text-emerald-50/90">bills. busca únicamente notificaciones de bancos compatibles. BHD es el piloto; el mismo flujo incorporará cada banco nuevo.</p>
          </div>
          <CardContent className="space-y-5 p-6">
            {loading ? <div className="flex min-h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div> : activeInbox ? (
              <div className="space-y-5">
                <div className="flex gap-3 rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-200">
                  <Check className="h-5 w-5 shrink-0" />
                  <div><p className="font-semibold">Gmail conectado</p><p className="mt-1 text-xs opacity-80">{activeInbox.email} · acceso de solo lectura a los correos bancarios compatibles.</p></div>
                </div>
                {summary && <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-muted p-3"><p className="text-lg font-bold">{summary.scanned}</p><p className="text-[10px] text-muted-foreground">revisados</p></div>
                  <div className="rounded-xl bg-muted p-3"><p className="text-lg font-bold">{summary.parsed}</p><p className="text-[10px] text-muted-foreground">reconocidos</p></div>
                  <div className="rounded-xl bg-muted p-3"><p className="text-lg font-bold text-emerald-600">{summary.created}</p><p className="text-[10px] text-muted-foreground">agregados</p></div>
                </div>}
                <Button variant="outline" className="w-full gap-2" disabled={busy === 'sync'} onClick={() => void sync(activeInbox)}>
                  {busy === 'sync' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sincronizar de nuevo
                </Button>
                <Button className="w-full gap-2" disabled={Boolean(busy)} onClick={complete}>
                  {busy === 'complete' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Ir a mi dashboard
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-3 rounded-xl border p-4"><Inbox className="h-5 w-5 shrink-0 text-emerald-500" /><div><p className="text-sm font-semibold">Privacidad por diseño</p><p className="mt-1 text-xs text-muted-foreground">Solo lectura. Filtramos remitentes bancarios soportados y no guardamos el cuerpo de correos procesados correctamente.</p></div></div>
                <Button className="h-12 w-full gap-2 text-base" disabled={busy === 'google'} onClick={connectGoogle}>
                  {busy === 'google' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} {reconnectNeeded ? 'Reconectar Gmail' : 'Conectar Gmail'}
                </Button>
                <p className="text-center text-[11px] text-muted-foreground">Google mostrará su pantalla segura de autorización. Consulta exactamente cómo usamos estos datos en la <a href="/legal/google-api-disclosure" target="_blank" className="underline">divulgación de Google API</a>.</p>
              </div>
            )}

            {error && <div className="flex gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive"><AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span></div>}

            {!activeInbox && <details className="rounded-xl border p-4" open={googleUnavailable}>
              <summary className="cursor-pointer text-sm font-semibold">Prefiero reenvío de correo</summary>
              <div className="mt-4 space-y-4 text-sm text-muted-foreground">
                <p>Alternativa universal para Gmail, Outlook, Yahoo o iCloud. Requiere configurar una regla una sola vez fuera de bills.</p>
                {forwardingAddress ? <>
                  <div className="flex gap-2"><Input value={forwardingAddress} readOnly className="font-mono text-xs" /><Button variant="outline" onClick={copyAddress}>{copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}</Button></div>
                  <p>Reenvía únicamente los mensajes de alertas de BHD a esta dirección privada.</p>
                </> : <Button variant="outline" className="w-full gap-2" disabled={busy === 'forwarding'} onClick={createForwarding}>{busy === 'forwarding' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Crear dirección privada</Button>}
              </div>
            </details>}

            {!activeInbox && <button className="w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline" disabled={busy === 'complete'} onClick={complete}>Continuar con movimientos manuales por ahora</button>}
          </CardContent>
        </Card>

        <div className="rounded-2xl border border-border/60 bg-card/50 p-4">
          <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-emerald-500" /><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cobertura multi-banco</p></div>
          <div className="mt-3 flex flex-wrap gap-2">{institutions.map((institution) => (
            <span key={institution.code} className="rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">{institution.displayName} · {institution.status === 'PILOT' ? 'piloto' : institution.status === 'ACTIVE' ? 'activo' : 'próximamente'}</span>
          ))}</div>
          <a href="/legal/privacy" target="_blank" className="mt-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline">Privacidad y manejo de datos <ExternalLink className="h-3 w-3" /></a>
        </div>
      </div>
    </div>
  );
}
