import { useState } from 'react';
import { Loader2, Mail, Send } from 'lucide-react';
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch } from '@/shared/ui';
import type { AccountSettingsModel } from '../model/useAccountSettings';

export function AccountEmailNotificationsSection({ model }: { model: AccountSettingsModel }) {
  const value = model.emailPreferences;
  const [activeToggle, setActiveToggle] = useState<'weekly' | 'critical' | 'schedule' | null>(null);

  if (!value) {
    return <section className="h-32 animate-pulse rounded-2xl bg-muted" aria-label="Cargando preferencias de correo" />;
  }

  const busy = model.busy === 'email-preferences';

  const update = (changes: Partial<typeof value>, fieldKey: 'weekly' | 'critical' | 'schedule') => {
    setActiveToggle(fieldKey);
    model.updateEmailPreferences({
      weeklyDigestEnabled: value.weeklyDigestEnabled,
      criticalAlertsEnabled: value.criticalAlertsEnabled,
      digestSchedule: value.digestSchedule,
      ...changes,
    });
  };

  return (
    <section className="space-y-4 rounded-2xl border p-4" aria-labelledby="email-notifications-title">
      <div className="flex items-start gap-3">
        <Mail className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
        <div>
          <h3 id="email-notifications-title" className="text-sm font-bold">Notificaciones por correo</h3>
          <p className="text-xs text-muted-foreground">Se enviarán a {value.recipientMasked} en la zona {value.timezone}.</p>
        </div>
      </div>

      <div className="flex min-h-11 items-center justify-between gap-4 rounded-xl border p-3 bg-card/50 transition-colors">
        <div className="space-y-0.5">
          <span className="block text-xs font-bold">Pulso semanal</span>
          <span className="block text-[11px] text-muted-foreground">Tus últimos siete días y los próximos cobros.</span>
        </div>
        <Switch
          aria-label="Activar Pulso semanal"
          checked={value.weeklyDigestEnabled}
          disabled={busy}
          loading={busy && activeToggle === 'weekly'}
          onCheckedChange={(checked) => update({ weeklyDigestEnabled: checked }, 'weekly')}
        />
      </div>

      {value.weeklyDigestEnabled && (
        <div className="space-y-1.5 pl-1">
          <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5" htmlFor="digest-schedule">
            <span>Horario del Pulso</span>
            {busy && activeToggle === 'schedule' && (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            )}
          </label>
          <Select
            value={value.digestSchedule}
            disabled={busy}
            onValueChange={(schedule) => update({ digestSchedule: schedule as typeof value.digestSchedule }, 'schedule')}
          >
            <SelectTrigger id="digest-schedule">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MONDAY_0730">Lunes, 7:30 a. m.</SelectItem>
              <SelectItem value="SUNDAY_1800">Domingo, 6:00 p. m.</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex min-h-11 items-center justify-between gap-4 rounded-xl border p-3 bg-card/50 transition-colors">
        <div className="space-y-0.5">
          <span className="block text-xs font-bold">Alertas críticas</span>
          <span className="block text-[11px] text-muted-foreground">Cobros confirmados importantes y cambios relevantes.</span>
        </div>
        <Switch
          aria-label="Activar alertas críticas"
          checked={value.criticalAlertsEnabled}
          disabled={busy}
          loading={busy && activeToggle === 'critical'}
          onCheckedChange={(checked) => update({ criticalAlertsEnabled: checked }, 'critical')}
        />
      </div>

      <Button
        variant="outline"
        className="w-full gap-2 transition-all"
        disabled={model.busy === 'email-test' || busy}
        onClick={model.sendEmailTest}
      >
        {model.busy === 'email-test' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Enviando correo de prueba...</span>
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            <span>Enviarme un correo de prueba</span>
          </>
        )}
      </Button>

      {model.notice && (
        <p role="status" className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
          {model.notice}
        </p>
      )}
    </section>
  );
}
