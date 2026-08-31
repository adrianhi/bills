import React, { useMemo, useState } from 'react';
import { Check, FileDown, FileJson, FileSpreadsheet, FileText, Loader2, Share2 } from 'lucide-react';
import type { PeriodSelection } from '@/entities/period';
import { accountService } from '@/entities/account/api/account.service';
import { Button, Card, CardContent, SafeDiagnosticButton } from '@/shared/ui';
import { shareOrDownloadFile, supportsFileShare } from '@/shared/lib';
import { reportService, type FinancialReportFormat } from '../api/report.service';

type ExportFormat = FinancialReportFormat | 'json';

interface ExportCenterCardProps {
  period: PeriodSelection;
  currency: string;
  filters: {
    category?: string;
    status?: string;
    organization?: string;
    transactionType?: string;
    search?: string;
  };
}

const FORMATS: Array<{ id: ExportFormat; label: string; description: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'pdf', label: 'PDF', description: 'Informe ejecutivo con resumen, comparación e insights.', icon: FileText },
  { id: 'xlsx', label: 'Excel', description: 'Resumen, comparación, categorías, comercios y movimientos.', icon: FileSpreadsheet },
  { id: 'csv', label: 'CSV', description: 'Movimientos de la vista seleccionada para analizar.', icon: FileDown },
  { id: 'json', label: 'JSON', description: 'Copia completa de tu cuenta (portabilidad, todo el historial).', icon: FileJson },
];

export const ExportCenterCard: React.FC<ExportCenterCardProps> = ({ period, currency, filters }) => {
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [includeNotes, setIncludeNotes] = useState(false);
  const [working, setWorking] = useState(false);
  const [outcome, setOutcome] = useState<'shared' | 'downloaded' | null>(null);
  const [error, setError] = useState<unknown>(null);
  const canShare = useMemo(() => supportsFileShare(), []);
  const activeFiltersCount = [filters.category, filters.status, filters.organization, filters.transactionType, filters.search].filter(Boolean).length;

  const run = async () => {
    setWorking(true);
    setError(null);
    setOutcome(null);
    try {
      if (format === 'json') {
        const blob = await accountService.exportData();
        const filename = `bills-cuenta-${new Date().toISOString().slice(0, 10)}.json`;
        const result = await shareOrDownloadFile(blob, filename, 'Copia de mi cuenta bills.');
        setOutcome(result === 'cancelled' ? null : result);
      } else {
        const { blob, filename } = await reportService.financialExport({
          format,
          currency,
          month: period.startDate ? undefined : period.month,
          startDate: period.startDate,
          endDate: period.endDate,
          category: filters.category || undefined,
          status: filters.status || undefined,
          organization: filters.organization || undefined,
          transactionType: filters.transactionType || undefined,
          search: filters.search || undefined,
          includeNotes: format === 'pdf' ? false : includeNotes,
        });
        const result = await shareOrDownloadFile(blob, filename, 'Informe financiero bills.');
        setOutcome(result === 'cancelled' ? null : result);
      }
    } catch (cause) {
      setError(cause);
    } finally {
      setWorking(false);
    }
  };

  return (
    <Card className="border-border/60 shadow-sm" aria-label="Centro de exportación">
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div>
          <h3 className="font-bold">Centro de exportación</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Período: <span className="font-semibold text-foreground">{period.label}</span> · Moneda: <span className="font-semibold text-foreground">{currency}</span>
            {activeFiltersCount > 0 && <> · {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''} activo{activeFiltersCount > 1 ? 's' : ''}</>}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Los archivos se generan al momento y no se almacenan en el servidor.</p>
        </div>

        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Formato de exportación">
          {FORMATS.map(({ id, label, description, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={format === id}
              onClick={() => { setFormat(id); setOutcome(null); setError(null); }}
              className={`flex min-h-20 flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${format === id ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20' : 'border-border bg-card hover:bg-muted/50'}`}
            >
              <span className="flex items-center gap-1.5 text-sm font-bold"><Icon className="h-4 w-4 text-primary" />{label}</span>
              <span className="text-[11px] leading-snug text-muted-foreground">{description}</span>
            </button>
          ))}
        </div>

        {format !== 'pdf' && format !== 'json' && (
          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-border px-3">
            <input
              type="checkbox"
              checked={includeNotes}
              onChange={(event) => setIncludeNotes(event.target.checked)}
              className="h-4 w-4 accent-emerald-600"
            />
            <span className="text-sm"><span className="font-semibold">Incluir notas</span> <span className="text-muted-foreground">· desactivado por defecto para compartir sin datos sensibles</span></span>
          </label>
        )}

        {error !== null && (
          <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3" role="alert">
            <p className="text-sm font-semibold text-destructive">No pudimos generar el archivo</p>
            <p className="text-xs text-muted-foreground">Si el período es muy grande, prueba con un rango más corto o el formato CSV.</p>
            <SafeDiagnosticButton error={error} area="exportacion" extra={{ formato: format }} />
          </div>
        )}
        {outcome && (
          <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400" role="status">
            <Check className="h-4 w-4" />{outcome === 'shared' ? 'Archivo compartido' : 'Descarga iniciada'}
          </p>
        )}

        <Button type="button" onClick={() => void run()} disabled={working} className="min-h-12 w-full gap-2 rounded-xl">
          {working ? <Loader2 className="h-4 w-4 animate-spin" /> : canShare ? <Share2 className="h-4 w-4" /> : <FileDown className="h-4 w-4" />}
          {working ? 'Generando…' : canShare ? 'Compartir o descargar' : 'Descargar'}
        </Button>
      </CardContent>
    </Card>
  );
};
