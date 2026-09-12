import { useState } from 'react';
import { CheckCircle2, Mail, Send, Sparkles } from 'lucide-react';
import { useSendWeeklyDigestTest, useWeeklyDigestPreview } from '@/entities/proactive';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui';

export interface WeeklyDigestPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
}

export function WeeklyDigestPreviewDialog({
  open,
  onOpenChange,
  currency,
}: WeeklyDigestPreviewDialogProps) {
  const activeCurrency = currency === 'USD' ? 'USD' : 'DOP';
  const preview = useWeeklyDigestPreview(activeCurrency, open);
  const sendTestMutation = useSendWeeklyDigestTest();
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  const handleSendTest = async () => {
    try {
      const res = await sendTestMutation.mutateAsync({ currency: activeCurrency });
      setSendSuccess(
        `Prueba procesada (${res.mode === 'SMTP' ? 'Enviado por correo' : 'Registrado en log'}).`
      );
    } catch {
      setSendSuccess('No se pudo enviar la prueba.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-6">
        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Pulso Semanal
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Mail className="h-3 w-3" /> Correo automatizado
            </span>
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            Resumen Semanal por Correo
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Así luce el reporte de tus últimos siete días, próximos cobros y margen diario.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-3">
          {preview.isLoading ? (
            <div className="h-72 animate-pulse rounded-xl bg-muted" />
          ) : preview.data?.html ? (
            <div className="h-80 w-full overflow-hidden rounded-xl border border-border bg-slate-950 shadow-inner">
              <iframe
                title="Vista previa del correo semanal"
                srcDoc={preview.data.html}
                className="h-full w-full border-0"
                sandbox="allow-same-origin"
              />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No se pudo cargar la vista previa.</p>
          )}

          {sendSuccess && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-2.5 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{sendSuccess}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" className="text-xs" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button
            className="text-xs gap-1.5"
            disabled={sendTestMutation.isPending || preview.isLoading}
            onClick={handleSendTest}
          >
            <Send className="h-3.5 w-3.5" />
            {sendTestMutation.isPending ? 'Enviando...' : 'Enviar correo de prueba'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
