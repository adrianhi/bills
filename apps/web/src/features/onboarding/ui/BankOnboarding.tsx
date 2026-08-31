import { AlertCircle, ArrowRight, Building2, Check, ExternalLink, Inbox, Loader2, LogOut, Mail, RefreshCw, Sparkles } from 'lucide-react';
import { Button, Card, CardContent } from '@/shared/ui';
import { BankSelector } from '@/entities/connection';
import { useBankOnboarding } from '../model/useBankOnboarding';

interface BankOnboardingProps {
  authToken: string;
  onComplete: () => void;
  onLogout: () => void;
}

export function BankOnboarding({ authToken, onComplete, onLogout }: BankOnboardingProps) {
  const model = useBankOnboarding(Boolean(authToken), onComplete);
  const { institutions, activeInbox, reconnectNeeded, selectedInstitutionCodes, setSelectedInstitutionCodes, loading, busy,
    syncState, isSyncing,
    error, notice, googleUnavailable, connectGoogle, sync, saveSelection, complete } = model;
  const summary = activeInbox?.lastSyncSummary || null;

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
            <p className="mt-2 max-w-lg text-sm text-emerald-50/90">Elige tus bancos y bills. buscará únicamente sus notificaciones compatibles.</p>
          </div>
          <CardContent className="space-y-5 p-6">
            {loading ? <div className="flex min-h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div> : activeInbox ? (
              <div className="space-y-5">
                <div className="flex gap-3 rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-200">
                  <Check className="h-5 w-5 shrink-0" />
                  <div><p className="font-semibold">Gmail conectado</p><p className="mt-1 text-xs opacity-80">{activeInbox.email} · acceso de solo lectura a los correos bancarios compatibles.</p></div>
                </div>
                {activeInbox.requiresBankSelection ? (
                  <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                    <div className="flex gap-2 text-sm text-amber-800 dark:text-amber-200"><AlertCircle className="h-5 w-5 shrink-0" /><p>Selecciona los bancos que autorizas antes de continuar sincronizando.</p></div>
                    <BankSelector institutions={institutions} selectedCodes={selectedInstitutionCodes} onChange={setSelectedInstitutionCodes} disabled={Boolean(busy)} />
                    <Button className="w-full" disabled={Boolean(busy) || selectedInstitutionCodes.length === 0} onClick={() => saveSelection()}>
                      {busy === 'selection' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Guardar bancos
                    </Button>
                  </div>
                ) : null}
                {isSyncing && (
                  <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-4" role="status" aria-live="polite">
                    <div className="flex items-center gap-3"><Loader2 className="h-5 w-5 shrink-0 animate-spin text-sky-600" /><div><p className="text-sm font-semibold text-sky-800 dark:text-sky-200">{syncState === 'PENDING' ? 'Preparando tu primera sincronización' : 'Importando tus movimientos'}</p><p className="mt-1 text-xs text-sky-700/80 dark:text-sky-300/80">Puedes entrar a la aplicación; este proceso continuará en segundo plano.</p></div></div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sky-500/15"><div className="h-full w-2/3 animate-pulse rounded-full bg-sky-500" /></div>
                  </div>
                )}
                {syncState === 'FAILED' && (
                  <div className="flex gap-2 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300" role="alert"><AlertCircle className="h-4 w-4 shrink-0" /><span>No pudimos completar la última sincronización. Puedes reintentarlo sin duplicar movimientos.</span></div>
                )}
                {notice && <div className="rounded-xl bg-sky-500/10 p-3 text-xs text-sky-700 dark:text-sky-300">{notice}</div>}
                {(activeInbox.failedEvents || 0) > 0 && <div className="flex gap-2 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300"><AlertCircle className="h-4 w-4 shrink-0" /><span>{activeInbox.failedEvents} correo{activeInbox.failedEvents === 1 ? '' : 's'} necesita{activeInbox.failedEvents === 1 ? '' : 'n'} reprocesamiento. La conexión sigue activa, pero la última sincronización fue parcial.</span></div>}
                {summary && <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-muted p-3"><p className="text-lg font-bold">{summary.scanned}</p><p className="text-[10px] text-muted-foreground">revisados</p></div>
                  <div className="rounded-xl bg-muted p-3"><p className="text-lg font-bold">{summary.parsed}</p><p className="text-[10px] text-muted-foreground">reconocidos</p></div>
                  <div className="rounded-xl bg-muted p-3"><p className="text-lg font-bold text-emerald-600">{summary.created}</p><p className="text-[10px] text-muted-foreground">agregados</p></div>
                </div>}
                <Button variant="outline" className="min-h-11 w-full gap-2" disabled={activeInbox.requiresBankSelection || busy === 'sync' || isSyncing} onClick={() => sync(activeInbox)}>
                  {busy === 'sync' || isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} {isSyncing ? 'Sincronizando…' : syncState === 'FAILED' ? 'Reintentar sincronización' : 'Sincronizar de nuevo'}
                </Button>
                <Button className="min-h-11 w-full gap-2" disabled={activeInbox.requiresBankSelection || Boolean(busy)} onClick={() => complete()}>
                  {busy === 'complete' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Ir a mi dashboard
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-3 rounded-xl border p-4"><Inbox className="h-5 w-5 shrink-0 text-emerald-500" /><div><p className="text-sm font-semibold">Privacidad por diseño</p><p className="mt-1 text-xs text-muted-foreground">Solo lectura. Filtramos remitentes bancarios soportados y no guardamos el cuerpo de correos procesados correctamente.</p></div></div>
                <BankSelector institutions={institutions} selectedCodes={selectedInstitutionCodes} onChange={setSelectedInstitutionCodes} disabled={Boolean(busy)} />
                <Button className="h-12 w-full gap-2 text-base" disabled={busy === 'google' || selectedInstitutionCodes.length === 0} onClick={() => connectGoogle()}>
                  {busy === 'google' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} {reconnectNeeded ? 'Reconectar Gmail' : 'Conectar Gmail'}
                </Button>
                <p className="text-center text-[11px] text-muted-foreground">Google mostrará su pantalla segura de autorización. Consulta exactamente cómo usamos estos datos en la <a href="/legal/google-api-disclosure" target="_blank" className="underline">divulgación de Google API</a>.</p>
              </div>
            )}

            {error && <div className="flex gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive"><AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span></div>}

            {!activeInbox && googleUnavailable && <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-700 dark:text-amber-300">Gmail OAuth no está disponible en este entorno. Puedes continuar con movimientos manuales.</div>}

            {!activeInbox && <button className="w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline" disabled={busy === 'complete'} onClick={() => complete()}>Continuar con movimientos manuales por ahora</button>}
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
