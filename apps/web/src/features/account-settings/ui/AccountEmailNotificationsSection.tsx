import { Loader2, Mail, Send } from 'lucide-react';
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui';
import type { AccountSettingsModel } from '../model/useAccountSettings';

export function AccountEmailNotificationsSection({ model }: { model: AccountSettingsModel }) {
  const value = model.emailPreferences;
  if (!value) return <section className="h-32 animate-pulse rounded-2xl bg-muted" aria-label="Cargando preferencias de correo" />;
  const update = (changes: Partial<typeof value>) => model.updateEmailPreferences({
    weeklyDigestEnabled: value.weeklyDigestEnabled,
    criticalAlertsEnabled: value.criticalAlertsEnabled,
    digestSchedule: value.digestSchedule,
    ...changes,
  });
  const busy = model.busy === 'email-preferences';
  return (
    <section className="space-y-4 rounded-2xl border p-4" aria-labelledby="email-notifications-title">
      <div className="flex items-start gap-3">
        <Mail className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
        <div><h3 id="email-notifications-title" className="text-sm font-bold">Notificaciones por correo</h3><p className="text-xs text-muted-foreground">Se enviarán a {value.recipientMasked} en la zona {value.timezone}.</p></div>
      </div>
      <label className="flex min-h-11 items-center justify-between gap-4 rounded-xl border p-3">
        <span><span className="block text-xs font-bold">Pulso semanal</span><span className="block text-[11px] text-muted-foreground">Tus últimos siete días y los próximos cobros.</span></span>
        <input type="checkbox" role="switch" aria-label="Activar Pulso semanal" checked={value.weeklyDigestEnabled} disabled={busy} onChange={(event) => update({ weeklyDigestEnabled: event.target.checked })} className="h-5 w-5 accent-emerald-600" />
      </label>
      {value.weeklyDigestEnabled && <div className="space-y-1.5"><label className="text-xs font-semibold" htmlFor="digest-schedule">Horario del Pulso</label><Select value={value.digestSchedule} disabled={busy} onValueChange={(schedule) => update({ digestSchedule: schedule as typeof value.digestSchedule })}><SelectTrigger id="digest-schedule"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="MONDAY_0730">Lunes, 7:30 a. m.</SelectItem><SelectItem value="SUNDAY_1800">Domingo, 6:00 p. m.</SelectItem></SelectContent></Select></div>}
      <label className="flex min-h-11 items-center justify-between gap-4 rounded-xl border p-3">
        <span><span className="block text-xs font-bold">Alertas críticas</span><span className="block text-[11px] text-muted-foreground">Cobros confirmados importantes y cambios relevantes.</span></span>
        <input type="checkbox" role="switch" aria-label="Activar alertas críticas" checked={value.criticalAlertsEnabled} disabled={busy} onChange={(event) => update({ criticalAlertsEnabled: event.target.checked })} className="h-5 w-5 accent-emerald-600" />
      </label>
      <Button variant="outline" className="w-full gap-2" disabled={model.busy === 'email-test'} onClick={model.sendEmailTest}>{model.busy === 'email-test' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Enviarme un correo de prueba</Button>
      {model.notice && <p role="status" className="text-xs text-emerald-700 dark:text-emerald-300">{model.notice}</p>}
    </section>
  );
}
