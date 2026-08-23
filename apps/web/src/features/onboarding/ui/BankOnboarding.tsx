import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Check,
  Clipboard,
  Loader2,
  LogOut,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { Button, Card, CardContent, Input } from '@/shared/ui';

interface Institution {
  code: string;
  displayName: string;
  status: 'PILOT' | 'ACTIVE' | 'COMING_SOON' | 'DISABLED';
}

interface Connection {
  id: string;
  status: string;
  institution: Institution;
  ingestionAddress?: { aliasToken: string; domain: string } | null;
}

interface BankOnboardingProps {
  authToken: string;
  onComplete: () => void;
  onLogout: () => void;
}

export function BankOnboarding({ authToken, onComplete, onLogout }: BankOnboardingProps) {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const headers = useCallback(
    () => ({ Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' }),
    [authToken]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [institutionsResponse, connectionsResponse] = await Promise.all([
        fetch('/api/v1/financial-institutions', { headers: headers() }),
        fetch('/api/v1/bank-connections', { headers: headers() }),
      ]);
      if (!institutionsResponse.ok || !connectionsResponse.ok) {
        const body = await connectionsResponse.json().catch(() => null);
        throw new Error(body?.error?.message || 'No pudimos cargar la configuración bancaria.');
      }
      const institutionBody = await institutionsResponse.json();
      const connectionBody = await connectionsResponse.json();
      setInstitutions(institutionBody.data || []);
      const existing = (connectionBody.data || []).find(
        (item: Connection) => item.institution?.code === 'BHD'
      );
      setConnection(existing || null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No pudimos cargar la configuración bancaria.');
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    void load();
  }, [load]);

  const createConnection = async () => {
    setCreating(true);
    setError('');
    try {
      const response = await fetch('/api/v1/bank-connections', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ institutionCode: 'BHD' }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message || 'No se pudo crear la conexión.');
      setConnection(body.data);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'No se pudo crear la conexión.');
    } finally {
      setCreating(false);
    }
  };

  const forwardingAddress = connection?.ingestionAddress
    ? `${connection.ingestionAddress.aliasToken}@${connection.ingestionAddress.domain}`
    : '';

  const copyAddress = async () => {
    if (!forwardingAddress) return;
    await navigator.clipboard.writeText(forwardingAddress);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const futureBanks = institutions.filter((institution) => institution.status === 'COMING_SOON');

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:py-14">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
              <span className="text-xl font-black">b.</span>
            </div>
            <div>
              <p className="font-bold">Configura tu primera conexión</p>
              <p className="text-xs text-muted-foreground">Toma menos de dos minutos.</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="gap-2" onClick={onLogout}>
            <LogOut className="h-4 w-4" />
            Salir
          </Button>
        </div>

        <Card className="overflow-hidden border-border/60 shadow-xl">
          <div className="bg-gradient-to-br from-emerald-600 to-teal-600 p-6 text-white">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
              <Building2 className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold">BHD es nuestro banco piloto</h1>
            <p className="mt-2 max-w-lg text-sm text-emerald-50/90">
              Conectamos por reenvío de notificaciones: no pedimos usuario, contraseña ni acceso a tu banca en línea.
            </p>
          </div>

          <CardContent className="space-y-5 p-6">
            {loading ? (
              <div className="flex min-h-40 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
              </div>
            ) : connection && forwardingAddress ? (
              <div className="space-y-5">
                <div className="flex gap-3 rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-200">
                  <ShieldCheck className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-semibold">Tu dirección privada está lista</p>
                    <p className="mt-1 text-xs opacity-80">Úsala únicamente para reenviar las notificaciones que recibes de BHD.</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input value={forwardingAddress} readOnly className="font-mono text-xs" />
                  <Button variant="outline" className="shrink-0 gap-2" onClick={copyAddress}>
                    {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                    {copied ? 'Copiada' : 'Copiar'}
                  </Button>
                </div>
                <ol className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex gap-3"><span className="font-semibold text-foreground">1.</span> Abre la configuración de reenvío de tu correo.</li>
                  <li className="flex gap-3"><span className="font-semibold text-foreground">2.</span> Reenvía las notificaciones BHD a esta dirección privada.</li>
                  <li className="flex gap-3"><span className="font-semibold text-foreground">3.</span> Tu primera notificación válida activará la conexión.</li>
                </ol>
                <Button className="w-full gap-2" onClick={onComplete}>
                  Ir a mi dashboard <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Crearemos un alias aleatorio vinculado únicamente a tu workspace. Podrás rotarlo si alguna vez se expone.
                </p>
                <Button className="w-full gap-2" disabled={creating} onClick={createConnection}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Generar mi dirección de reenvío
                </Button>
              </div>
            )}

            {error && (
              <div className="flex gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <div className="flex-1">
                  <p>{error}</p>
                  <button className="mt-2 font-semibold underline" onClick={() => void load()}>Reintentar</button>
                </div>
              </div>
            )}

            {!connection && (
              <button className="w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline" onClick={onComplete}>
                Continuar por ahora y registrar movimientos manualmente
              </button>
            )}
          </CardContent>
        </Card>

        <div className="rounded-2xl border border-border/60 bg-card/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Diseñado para crecer</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(futureBanks.length ? futureBanks : [
              { code: 'POPULAR', displayName: 'Banco Popular' },
              { code: 'BANRESERVAS', displayName: 'Banreservas' },
              { code: 'QIK', displayName: 'Qik' },
            ]).map((institution) => (
              <span key={institution.code} className="rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
                {institution.displayName} · próximamente
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
