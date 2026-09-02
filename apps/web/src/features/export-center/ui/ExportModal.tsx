import { Check, Download, Loader2, Share2 } from 'lucide-react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, SafeDiagnosticButton } from '@/shared/ui';
import type { ExportFormInitial } from '../model/export-form';
import { useExportForm } from '../model/useExportForm';
import { useReportExport } from '../model/useReportExport';
import { useReportInstitutions } from '../model/useReportInstitutions';
import { ExportCustomizationFields } from './ExportCustomizationFields';
import { ExportFormatSelector } from './ExportFormatSelector';
import { ExportScopeFields } from './ExportScopeFields';

interface ExportModalProps extends ExportFormInitial {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportModal({ open, onOpenChange, ...initial }: ExportModalProps) {
  const { state, period, setField, budgetEligible, validationError } = useExportForm({ open, ...initial });
  const { working, error, outcome, canShare, handleExport } = useReportExport(open, state, period);
  const { institutions, loading: institutionsLoading, failed: institutionsFailed } = useReportInstitutions(open);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto p-5 sm:max-w-2xl sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold"><Download className="h-5 w-5 text-primary" />Centro de exportación</DialogTitle>
          <p className="text-xs text-muted-foreground">Personaliza el alcance y el contenido de tus reportes de gastos.</p>
        </DialogHeader>
        <div className="mt-4 space-y-5">
          {state.format !== 'json' && <ExportScopeFields
            initialPeriod={initial.initialPeriod} periodType={state.periodType} setPeriodType={(value) => setField('periodType', value)}
            customStartDate={state.customStartDate} setCustomStartDate={(value) => setField('customStartDate', value)}
            customEndDate={state.customEndDate} setCustomEndDate={(value) => setField('customEndDate', value)}
            currency={state.currency} setCurrency={(value) => setField('currency', value)}
            institutions={institutions} institutionsLoading={institutionsLoading} institutionsFailed={institutionsFailed}
            institutionCodes={state.institutionCodes} setInstitutionCodes={(value) => setField('institutionCodes', value)}
            category={state.category} setCategory={(value) => setField('category', value)}
            status={state.status} setStatus={(value) => setField('status', value)}
            transactionType={state.transactionType} setTransactionType={(value) => setField('transactionType', value)}
          />}
          <ExportFormatSelector format={state.format} setFormat={(value) => setField('format', value)} />
          <ExportCustomizationFields format={state.format} title={state.title} setTitle={(value) => setField('title', value)}
            sections={state.sections} setSections={(value) => setField('sections', value)}
            includeNotes={state.includeNotes} setIncludeNotes={(value) => setField('includeNotes', value)} budgetEligible={budgetEligible} />
          {validationError && <p role="alert" className="text-xs text-destructive">{validationError}</p>}
          {error !== null && <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <p className="font-semibold">No pudimos generar el archivo</p>
            <p className="mt-0.5">{error instanceof Error ? error.message : 'Error inesperado durante la exportación.'}</p>
            <div className="mt-2"><SafeDiagnosticButton area="export-center" error={error} extra={{ format: state.format, currency: state.currency, periodType: state.periodType, institutionCodes: state.institutionCodes.join(','), category: state.category }} /></div>
          </div>}
          {outcome && <div role="status" className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <Check className="h-4 w-4 shrink-0" />{outcome === 'shared' ? '¡Archivo compartido con éxito!' : '¡Archivo descargado correctamente!'}
          </div>}
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={working} className="min-h-11">Cerrar</Button>
            <Button onClick={() => void handleExport()} disabled={working || Boolean(validationError)} className="min-h-11 gap-2 font-bold shadow-md">
              {working ? <><Loader2 className="h-4 w-4 animate-spin" />Generando {state.format.toUpperCase()}...</>
                : canShare ? <><Share2 className="h-4 w-4" />Compartir o descargar</>
                  : <><Download className="h-4 w-4" />Descargar {state.format.toUpperCase()}</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
