import { AlertTriangle, CheckCircle2, Clock3, MailPlus, RefreshCw } from 'lucide-react';
import type { InboxConnection } from '@/entities/connection/api/connection.service';
import { Button, Card, CardContent } from '@/shared/ui';

interface ConnectionHealthCardProps {
  connection?: InboxConnection;
  loading: boolean;
  failed: boolean;
  onOpenConnections: () => void;
}

function relativeTime(value?: string | null) {
  if (!value) return 'todavía no se ha completado una sincronización';
  const elapsed = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(elapsed) || elapsed < 0) return new Date(value).toLocaleString('es-DO');
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return 'hace menos de un minuto';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} día${days === 1 ? '' : 's'}`;
}

export function ConnectionHealthCard({ connection, loading, failed, onOpenConnections }: ConnectionHealthCardProps) {
  if (loading) return <div className="h-24 animate-pulse rounded-2xl bg-muted" aria-label="Consultando sincronización" data-product-tour="connection-health" />;

  if (failed) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5" data-product-tour="connection-health">
        <CardContent className="flex items-center gap-3 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1"><p className="text-sm font-bold">No pudimos consultar Gmail</p><p className="text-xs text-muted-foreground">Tus movimientos guardados siguen disponibles.</p></div>
          <Button variant="outline" className="min-h-11 shrink-0" onClick={onOpenConnections}>Revisar</Button>
        </CardContent>
      </Card>
    );
  }

  if (!connection || connection.status === 'REVOKED') {
    return (
      <Card className="border-border/60" data-product-tour="connection-health">
        <CardContent className="flex items-center gap-3 p-4">
          <MailPlus className="h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1"><p className="text-sm font-bold">Estás usando bills. en modo manual</p><p className="text-xs text-muted-foreground">Puedes registrar movimientos o conectar Gmail cuando quieras.</p></div>
          <Button variant="outline" className="min-h-11 shrink-0" onClick={onOpenConnections}>Conectar</Button>
        </CardContent>
      </Card>
    );
  }

  const processing = connection.currentJob?.status === 'PENDING' || connection.currentJob?.status === 'PROCESSING';
  const needsAttention = connection.requiresBankSelection || connection.status === 'REAUTH_REQUIRED' || connection.status === 'ERROR';
  const partial = (connection.failedEvents ?? 0) > 0 || connection.currentJob?.status === 'FAILED';

  if (processing) {
    return (
      <Card className="border-sky-500/30 bg-sky-500/5" data-product-tour="connection-health">
        <CardContent className="flex items-center gap-3 p-4">
          <RefreshCw className="h-5 w-5 shrink-0 animate-spin text-sky-600 motion-reduce:animate-none" />
          <div className="min-w-0 flex-1"><p className="text-sm font-bold">Importando movimientos</p><p className="text-xs text-muted-foreground">Puedes seguir usando la aplicación mientras termina.</p></div>
          <Button variant="ghost" className="min-h-11 shrink-0" onClick={onOpenConnections}>Ver</Button>
        </CardContent>
      </Card>
    );
  }

  if (needsAttention || partial) {
    const reauth = connection.status === 'REAUTH_REQUIRED';
    return (
      <Card className="border-amber-500/30 bg-amber-500/5" data-product-tour="connection-health">
        <CardContent className="flex items-center gap-3 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">{connection.requiresBankSelection ? 'Elige los bancos de esta conexión' : reauth ? 'Gmail necesita reconexión' : 'Sincronización parcial'}</p>
            <p className="text-xs text-muted-foreground">{reauth ? 'Durante la beta, Google puede pedir autorización cada siete días. Tus datos importados no se pierden.' : 'Revisa la conexión para completar la importación.'}</p>
          </div>
          <Button variant="outline" className="min-h-11 shrink-0" onClick={onOpenConnections}>{reauth ? 'Reconectar' : 'Revisar'}</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-emerald-500/20 bg-emerald-500/5" data-product-tour="connection-health">
      <CardContent className="flex items-center gap-3 p-4">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
        <div className="min-w-0 flex-1"><p className="text-sm font-bold">Gmail está conectado</p><p className="truncate text-xs text-muted-foreground">Actualizado {relativeTime(connection.lastSuccessfulSyncAt)} · {connection.selectedInstitutionCodes.join(', ')}</p></div>
        <Clock3 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </CardContent>
    </Card>
  );
}
