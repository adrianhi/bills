import React, { useState, useMemo } from 'react';
import {
  Check,
  Download,
  Loader2,
  Share2,
} from 'lucide-react';
import type { PeriodSelection } from '@/entities/period';
import { accountService } from '@/entities/account/api/account.service';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  SafeDiagnosticButton,
} from '@/shared/ui';
import { shareOrDownloadFile, supportsFileShare } from '@/shared/lib';
import { reportService } from '../api/report.service';
import { type ExportFormat } from '../model/export-options';
import { ExportScopeFields } from './ExportScopeFields';
import { ExportFormatSelector } from './ExportFormatSelector';

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPeriod?: PeriodSelection;
  initialCurrency?: string;
  initialFilters?: {
    category?: string;
    status?: string;
    organization?: string;
    transactionType?: string;
    search?: string;
  };
}

export const ExportModal: React.FC<ExportModalProps> = ({
  open,
  onOpenChange,
  initialPeriod,
  initialCurrency = 'DOP',
  initialFilters = {},
}) => {
  const [format, setFormat] = useState<ExportFormat>('xlsx');
  const [currency, setCurrency] = useState<string>(initialCurrency);
  const [periodType, setPeriodType] = useState<'current' | 'all' | 'custom'>('current');
  const [customStartDate, setCustomStartDate] = useState<string>(
    initialPeriod?.startDate || new Date().toISOString().slice(0, 7) + '-01'
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    initialPeriod?.endDate || new Date().toISOString().slice(0, 10)
  );
  const [bank, setBank] = useState<string>(initialFilters.organization || '');
  const [category, setCategory] = useState<string>(initialFilters.category || '');
  const [includeNotes, setIncludeNotes] = useState(false);
  const [working, setWorking] = useState(false);
  const [outcome, setOutcome] = useState<'shared' | 'downloaded' | null>(null);
  const [error, setError] = useState<unknown>(null);

  const canShare = useMemo(() => supportsFileShare(), []);

  const handleExport = async () => {
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
        let monthParam: string | undefined;
        let startParam: string | undefined;
        let endParam: string | undefined;

        if (periodType === 'current') {
          if (initialPeriod?.month) {
            monthParam = initialPeriod.month;
          } else if (initialPeriod?.startDate && initialPeriod?.endDate) {
            startParam = initialPeriod.startDate;
            endParam = initialPeriod.endDate;
          } else {
            monthParam = new Date().toISOString().slice(0, 7);
          }
        } else if (periodType === 'custom') {
          startParam = customStartDate;
          endParam = customEndDate;
        }

        const { blob, filename } = await reportService.financialExport({
          format,
          currency,
          month: monthParam,
          startDate: startParam,
          endDate: endParam,
          category: category || undefined,
          status: initialFilters.status || undefined,
          organization: bank || undefined,
          transactionType: initialFilters.transactionType || undefined,
          search: initialFilters.search || undefined,
          includeNotes: format === 'pdf' ? false : includeNotes,
        });

        const result = await shareOrDownloadFile(blob, filename, 'Informe financiero bills.');
        setOutcome(result === 'cancelled' ? null : result);
      }
    } catch (err) {
      setError(err);
    } finally {
      setWorking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Download className="h-5 w-5 text-primary" />
            Centro de exportación
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Configura los filtros y formato para descargar o compartir tus movimientos financieros.
          </p>
        </DialogHeader>

        <div className="mt-4 space-y-5">
          <ExportScopeFields
            initialPeriod={initialPeriod}
            periodType={periodType}
            setPeriodType={setPeriodType}
            customStartDate={customStartDate}
            setCustomStartDate={setCustomStartDate}
            customEndDate={customEndDate}
            setCustomEndDate={setCustomEndDate}
            currency={currency}
            setCurrency={setCurrency}
            bank={bank}
            setBank={setBank}
            category={category}
            setCategory={setCategory}
          />

          <ExportFormatSelector
            format={format}
            setFormat={setFormat}
            includeNotes={includeNotes}
            setIncludeNotes={setIncludeNotes}
          />

          {error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <p className="font-semibold">No pudimos generar el archivo</p>
              <p className="mt-0.5">
                {error instanceof Error ? error.message : 'Error inesperado durante la exportación.'}
              </p>
              <div className="mt-2">
                <SafeDiagnosticButton
                  area="export-center"
                  error={error}
                  extra={{ format, currency, periodType, bank, category }}
                />
              </div>
            </div>
          ) : null}

          {outcome ? (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <Check className="h-4 w-4 shrink-0" />
              <span>
                {outcome === 'shared'
                  ? '¡Archivo compartido con éxito!'
                  : '¡Archivo descargado correctamente!'}
              </span>
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={working}
              className="min-h-11 sm:w-auto"
            >
              Cerrar
            </Button>
            <Button
              onClick={handleExport}
              disabled={working}
              className="min-h-11 gap-2 sm:w-auto font-bold shadow-md"
            >
              {working ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generando {format.toUpperCase()}...
                </>
              ) : canShare ? (
                <>
                  <Share2 className="h-4 w-4" />
                  Compartir o Descargar
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Descargar {format.toUpperCase()}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
