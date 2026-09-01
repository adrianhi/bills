import { useEffect, useMemo, useState } from 'react';
import { Check, Download, Loader2, Share2 } from 'lucide-react';
import type { PeriodSelection } from '@/entities/period';
import { accountService } from '@/entities/account';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, SafeDiagnosticButton } from '@/shared/ui';
import { shareOrDownloadFile, supportsFileShare } from '@/shared/lib';
import { reportService, type FinancialReportSection } from '../api/report.service';
import { type ExportFormat } from '../model/export-options';
import { useReportInstitutions } from '../model/useReportInstitutions';
import { ExportCustomizationFields } from './ExportCustomizationFields';
import { ExportFormatSelector } from './ExportFormatSelector';
import { ExportScopeFields } from './ExportScopeFields';

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPeriod?: PeriodSelection;
  initialCurrency?: string;
  initialFilters?: {
    category?: string; status?: string; organization?: string; transactionType?: string; search?: string;
  };
}

const DEFAULT_SECTIONS: FinancialReportSection[] = ['summary', 'comparison', 'categories', 'merchants', 'movements'];

export function ExportModal({ open, onOpenChange, initialPeriod, initialCurrency = 'DOP', initialFilters = {} }: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('xlsx');
  const [currency, setCurrency] = useState(initialCurrency);
  const [periodType, setPeriodType] = useState<'current' | 'all' | 'custom'>('current');
  const [customStartDate, setCustomStartDate] = useState(initialPeriod?.startDate || `${new Date().toISOString().slice(0, 7)}-01`);
  const [customEndDate, setCustomEndDate] = useState(initialPeriod?.endDate || new Date().toISOString().slice(0, 10));
  const [institutionCodes, setInstitutionCodes] = useState<string[]>(initialFilters.organization ? [initialFilters.organization] : []);
  const [category, setCategory] = useState(initialFilters.category || '');
  const [status, setStatus] = useState(initialFilters.status || '');
  const [transactionType, setTransactionType] = useState(initialFilters.transactionType || '');
  const [search, setSearch] = useState(initialFilters.search || '');
  const [title, setTitle] = useState('');
  const [sections, setSections] = useState<FinancialReportSection[]>(DEFAULT_SECTIONS);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [working, setWorking] = useState(false);
  const [outcome, setOutcome] = useState<'shared' | 'downloaded' | null>(null);
  const [error, setError] = useState<unknown>(null);
  const { institutions, loading: institutionsLoading, failed: institutionsFailed } = useReportInstitutions(open);
  const canShare = useMemo(() => supportsFileShare(), []);
  const richFormat = format === 'pdf' || format === 'xlsx';

  useEffect(() => {
    if (!open) return;
    // oxlint-disable-next-line react/set-state-in-effect -- opening resets the form from the dashboard snapshot
    setCurrency(initialCurrency);
    setInstitutionCodes(initialFilters.organization ? [initialFilters.organization] : []);
    setCategory(initialFilters.category || ''); setStatus(initialFilters.status || '');
    setTransactionType(initialFilters.transactionType || ''); setSearch(initialFilters.search || '');
    setOutcome(null); setError(null);
  }, [open, initialCurrency, initialFilters.category, initialFilters.organization, initialFilters.search, initialFilters.status, initialFilters.transactionType]);

  const periodParams = () => {
    if (periodType === 'all') return {};
    if (periodType === 'custom') return { startDate: customStartDate, endDate: customEndDate };
    if (initialPeriod?.month) return { month: initialPeriod.month };
    if (initialPeriod?.startDate && initialPeriod?.endDate) return { startDate: initialPeriod.startDate, endDate: initialPeriod.endDate };
    return { month: new Date().toISOString().slice(0, 7) };
  };

  const handleExport = async () => {
    setWorking(true); setError(null); setOutcome(null);
    try {
      if (format === 'json') {
        const blob = await accountService.exportData();
        const filename = `bills-cuenta-${new Date().toISOString().slice(0, 10)}.json`;
        const result = await shareOrDownloadFile(blob, filename, 'Copia completa de mi cuenta bills.');
        setOutcome(result === 'cancelled' ? null : result);
      } else {
        const report = await reportService.financialExport({
          format, currency, ...periodParams(), institutionCodes: institutionCodes.length ? institutionCodes : undefined,
          category: category || undefined, status: status || undefined, transactionType: transactionType || undefined,
          search: search || undefined, includeNotes, title: richFormat && title.trim() ? title.trim() : undefined,
          sections: richFormat ? sections : undefined,
        });
        const result = await shareOrDownloadFile(report.blob, report.filename, title.trim() || 'Informe financiero bills.');
        setOutcome(result === 'cancelled' ? null : result);
      }
    } catch (cause) { setError(cause); }
    finally { setWorking(false); }
  };

  const invalidSections = richFormat && sections.length === 0;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto p-5 sm:max-w-2xl sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold"><Download className="h-5 w-5 text-primary" />Centro de exportación</DialogTitle>
          <p className="text-xs text-muted-foreground">Personaliza el alcance y el contenido de tus reportes de gastos.</p>
        </DialogHeader>
        <div className="mt-4 space-y-5">
          {format !== 'json' && <ExportScopeFields
            initialPeriod={initialPeriod} periodType={periodType} setPeriodType={setPeriodType}
            customStartDate={customStartDate} setCustomStartDate={setCustomStartDate}
            customEndDate={customEndDate} setCustomEndDate={setCustomEndDate}
            currency={currency} setCurrency={setCurrency}
            institutions={institutions} institutionsLoading={institutionsLoading} institutionsFailed={institutionsFailed}
            institutionCodes={institutionCodes} setInstitutionCodes={setInstitutionCodes}
            category={category} setCategory={setCategory} status={status} setStatus={setStatus}
            transactionType={transactionType} setTransactionType={setTransactionType} search={search} setSearch={setSearch}
          />}
          <ExportFormatSelector format={format} setFormat={setFormat} />
          <ExportCustomizationFields format={format} title={title} setTitle={setTitle} sections={sections}
            setSections={setSections} includeNotes={includeNotes} setIncludeNotes={setIncludeNotes} />
          {error !== null && <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <p className="font-semibold">No pudimos generar el archivo</p>
            <p className="mt-0.5">{error instanceof Error ? error.message : 'Error inesperado durante la exportación.'}</p>
            <div className="mt-2"><SafeDiagnosticButton area="export-center" error={error} extra={{ format, currency, periodType, institutionCodes: institutionCodes.join(','), category }} /></div>
          </div>}
          {outcome && <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <Check className="h-4 w-4 shrink-0" />{outcome === 'shared' ? '¡Archivo compartido con éxito!' : '¡Archivo descargado correctamente!'}
          </div>}
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={working} className="min-h-11">Cerrar</Button>
            <Button onClick={() => void handleExport()} disabled={working || invalidSections} className="min-h-11 gap-2 font-bold shadow-md">
              {working ? <><Loader2 className="h-4 w-4 animate-spin" />Generando {format.toUpperCase()}...</>
                : canShare ? <><Share2 className="h-4 w-4" />Compartir o descargar</>
                  : <><Download className="h-4 w-4" />Descargar {format.toUpperCase()}</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
