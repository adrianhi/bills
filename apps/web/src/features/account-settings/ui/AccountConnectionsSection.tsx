import { Check, Loader2, Mail, RefreshCw, ShieldCheck, Unplug } from 'lucide-react';
import { BankSelector } from '@/entities/connection';
import { Button } from '@/shared/ui';
import type { AccountSettingsModel } from '../model/useAccountSettings';

export function AccountConnectionsSection({ model }: { model: AccountSettingsModel }) {
  const {
    connections, institutions, newBankSelection, setNewBankSelection,
    bankSelections, setBankSelection, notice, busy,
    startGoogle, saveSelection, sync, disconnect,
  } = model;

  return (
    <section className="space-y-3 rounded-xl border p-4">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-emerald-500" />
        <h3 className="text-sm font-semibold">Correo conectado</h3>
      </div>
      {connections.length ? connections.map((connection) => {
        const selection = bankSelections[connection.id] ?? connection.selectedInstitutionCodes;
        const syncing = connection.currentJob?.status === 'PENDING' || connection.currentJob?.status === 'PROCESSING';
        return (
          <div key={connection.id} className="rounded-xl bg-muted/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{connection.email}</p>
                <p className="text-[11px] text-muted-foreground">
                  {connection.status === 'REAUTH_REQUIRED' ? 'Necesita reconexión'
                    : connection.currentJob?.status === 'PROCESSING' ? 'Sincronizando'
                      : connection.currentJob?.status === 'PENDING' ? 'Sincronización en cola'
                        : (connection.failedEvents || 0) > 0 ? 'Activa con fallos parciales' : 'Activa'}
                </p>
              </div>
              <ShieldCheck className={`h-4 w-4 ${(connection.failedEvents || 0) > 0 || connection.status !== 'ACTIVE' ? 'text-amber-500' : 'text-emerald-500'}`} />
            </div>
            <div className="mt-3 rounded-xl border bg-background/70 p-3">
              <BankSelector institutions={institutions} selectedCodes={selection} onChange={(codes) => setBankSelection(connection.id, codes)} disabled={Boolean(busy)} />
              <Button size="sm" className="mt-3 min-h-11 w-full gap-2" disabled={Boolean(busy) || selection.length === 0} onClick={() => saveSelection(connection.id)}>
                {busy === `selection:${connection.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Guardar bancos
              </Button>
            </div>
            <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
              <p>Última sincronización: {connection.lastSuccessfulSyncAt ? new Date(connection.lastSuccessfulSyncAt).toLocaleString('es-DO') : 'pendiente'}</p>
              {connection.lastSyncSummary && <p>{connection.lastSyncSummary.created} creados · {connection.lastSyncSummary.ignored} ignorados · {connection.lastSyncSummary.failed} fallidos</p>}
              {(connection.failedEvents || 0) > 0 && (
                <p className="text-amber-600 dark:text-amber-400">
                  {connection.failedEvents} correos pendientes de reprocesamiento{connection.lastErrorCode ? ` · ${connection.lastErrorCode}` : ''}
                </p>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              {connection.status === 'ACTIVE' ? (
                <Button size="sm" variant="outline" className="min-h-11 gap-1" disabled={connection.requiresBankSelection || Boolean(busy) || syncing} onClick={() => void sync(connection.id)}>
                  {busy === `sync:${connection.id}` || syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}{' '}
                  {syncing ? 'Sincronizando…' : 'Sincronizar'}
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="min-h-11 gap-1" disabled={Boolean(busy) || selection.length === 0} onClick={() => startGoogle(selection)}>
                  {busy === 'google' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />} Reconectar Gmail
                </Button>
              )}
              <Button size="sm" variant="ghost" className="min-h-11 gap-1 text-muted-foreground" disabled={Boolean(busy)} onClick={() => void disconnect(connection.id)}>
                <Unplug className="h-3 w-3" /> Desconectar
              </Button>
            </div>
          </div>
        );
      }) : (
        <div className="space-y-3">
          <BankSelector institutions={institutions} selectedCodes={newBankSelection} onChange={setNewBankSelection} disabled={Boolean(busy)} />
          <Button variant="outline" className="w-full gap-2" disabled={busy === 'google' || newBankSelection.length === 0} onClick={() => startGoogle()}>
            {busy === 'google' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Conectar Gmail
          </Button>
        </div>
      )}
      <a href="/legal/google-api-disclosure" target="_blank" className="block text-xs text-muted-foreground underline">Cómo bills. usa los datos de Google</a>
      {notice && <div className="rounded-lg bg-sky-500/10 p-2 text-xs text-sky-700 dark:text-sky-300">{notice}</div>}
    </section>
  );
}
