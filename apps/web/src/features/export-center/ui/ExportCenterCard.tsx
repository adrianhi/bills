import React, { useMemo, useState } from 'react';
import { Check, Download, FileDown, FileJson, FileSpreadsheet, FileText, Loader2, Share2, SlidersHorizontal } from 'lucide-react';
import type { PeriodSelection } from '@/entities/period';
import { accountService } from '@/entities/account';
import { Button, Card, CardContent, SafeDiagnosticButton } from '@/shared/ui';
import { shareOrDownloadFile, supportsFileShare } from '@/shared/lib';
import { reportService, type FinancialReportFormat } from '../api/report.service';
import { ExportModal } from './ExportModal';

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

const FORMATS: Array<{ id: FinancialReportFormat; label: string; description: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'xlsx', label: 'Excel', description: 'Libro personalizable con resumen y movimientos.', icon: FileSpreadsheet },
  { id: 'csv', label: 'CSV', description: 'Lista plana de movimientos lista para importar o analizar.', icon: FileDown },
  { id: 'pdf', label: 'PDF', description: 'Informe visual con métricas y anexo paginado.', icon: FileText },
];

export const ExportCenterCard: React.FC<ExportCenterCardProps> = ({ period, currency, filters }) => {
  const [format, setFormat] = useState<FinancialReportFormat>('xlsx');
  const [includeNotes, setIncludeNotes] = useState(false);
  const [working, setWorking] = useState(false);
  const [outcome, setOutcome] = useState<'shared' | 'downloaded' | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const canShare = useMemo(() => supportsFileShare(), []);
  const activeFiltersCount = [filters.category, filters.status, filters.organization, filters.transactionType, filters.search].filter(Boolean).length;

  const runQuickExport = async () => {
    setWorking(true);
    setError(null);
    setOutcome(null);
    try {
      const { blob, filename } = await reportService.financialExport({
        format, currency, month: period.startDate ? undefined : period.month,
        startDate: period.startDate, endDate: period.endDate,
        category: filters.category || undefined, status: filters.status || undefined,
        organization: filters.organization || undefined, transactionType: filters.transactionType || undefined,
        search: filters.search || undefined, includeNotes,
      });
      const result = await shareOrDownloadFile(blob, filename, 'Informe financiero bills.');
      setOutcome(result === 'cancelled' ? null : result);
    } catch (cause) {
      setError(cause);
    } finally {
      setWorking(false);
    }
  };

  const runAccountBackup = async () => {
    setWorking(true); setError(null); setOutcome(null);
    try {
      const blob = await accountService.exportData();
      const filename = `bills-cuenta-${new Date().toISOString().slice(0, 10)}.json`;
      const result = await shareOrDownloadFile(blob, filename, 'Copia completa de mi cuenta bills.');
      setOutcome(result === 'cancelled' ? null : result);
    } catch (cause) { setError(cause); }
    finally { setWorking(false); }
  };

  return (
    <>
      <Card className="border-border/60 shadow-sm" aria-label="Centro de exportación">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold flex items-center gap-2">
                <Download className="h-4 w-4 text-primary" />
                Centro de exportación
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Período: <span className="font-semibold text-foreground">{period.label}</span> · Moneda: <span className="font-semibold text-foreground">{currency}</span>
                {activeFiltersCount > 0 && <> · {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''} activo{activeFiltersCount > 1 ? 's' : ''}</>}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="gap-1.5 rounded-xl text-xs font-semibold"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filtrar y exportar
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Formato de exportación">
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

          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-border px-3">
              <input
                type="checkbox"
                checked={includeNotes}
                onChange={(event) => setIncludeNotes(event.target.checked)}
                className="h-4 w-4 accent-emerald-600"
              />
              <span className="text-sm"><span className="font-semibold">Incluir notas</span> <span className="text-muted-foreground">· desactivado por defecto para compartir sin datos sensibles</span></span>
          </label>

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

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => void runQuickExport()}
              disabled={working}
              className="min-h-12 flex-1 gap-2 rounded-xl"
            >
              {working ? <Loader2 className="h-4 w-4 animate-spin" /> : canShare ? <Share2 className="h-4 w-4" /> : <FileDown className="h-4 w-4" />}
              {working ? 'Generando…' : canShare ? 'Descargar o compartir' : 'Descargar rápida'}
            </Button>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs font-bold"><FileJson className="h-3.5 w-3.5 text-sky-600" />Copia completa JSON</p>
              <p className="text-[11px] text-muted-foreground">Respaldo de toda la cuenta; no aplica filtros del reporte.</p>
            </div>
            <Button type="button" variant="outline" size="sm" disabled={working} onClick={() => void runAccountBackup()} className="shrink-0">Descargar copia</Button>
          </div>
        </CardContent>
      </Card>

      <ExportModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        initialPeriod={period}
        initialCurrency={currency}
        initialFilters={filters}
      />
    </>
  );
};
