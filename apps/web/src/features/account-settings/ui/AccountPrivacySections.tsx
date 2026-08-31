import { AlertCircle, Download, Loader2, Trash2 } from 'lucide-react';
import { Button, Input, SafeDiagnosticButton } from '@/shared/ui';
import type { AccountSettingsModel } from '../model/useAccountSettings';

export function AccountPrivacySections({ model }: { model: AccountSettingsModel }) {
  const { confirmation, setConfirmation, error, diagnosticError, busy, exportData, deleteAccount } = model;
  return (
    <>
      <section className="space-y-3 rounded-xl border p-4">
        <h3 className="text-sm font-semibold">Tus datos</h3>
        <Button variant="outline" className="w-full justify-start gap-2" disabled={busy === 'export'} onClick={exportData}>
          {busy === 'export' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{' '}
          Descargar copia completa en JSON
        </Button>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <a href="/legal/terms" target="_blank" className="underline">Términos</a>
          <a href="/legal/privacy" target="_blank" className="underline">Privacidad</a>
          <a href="/legal/data-deletion" target="_blank" className="underline">Eliminación de datos</a>
        </div>
      </section>
      <section className="space-y-3 rounded-xl border border-destructive/30 p-4">
        <div className="flex items-center gap-2 text-destructive">
          <Trash2 className="h-4 w-4" />
          <h3 className="text-sm font-semibold">Eliminar mi cuenta</h3>
        </div>
        <p className="text-xs text-muted-foreground">Esta acción desconecta Google y elimina permanentemente tu perfil, transacciones, reglas y conexiones. Escribe ELIMINAR para confirmar.</p>
        <Input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="ELIMINAR" />
        <Button variant="destructive" className="w-full gap-2" disabled={confirmation.trim().toUpperCase() !== 'ELIMINAR' || busy === 'delete'} onClick={deleteAccount}>
          {busy === 'delete' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}{' '}
          Eliminar cuenta permanentemente
        </Button>
      </section>
      {error && (
        <div className="space-y-3 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
          <div className="flex gap-2"><AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span></div>
          <SafeDiagnosticButton error={diagnosticError} area="conexiones" className="min-h-11" />
        </div>
      )}
    </>
  );
}
