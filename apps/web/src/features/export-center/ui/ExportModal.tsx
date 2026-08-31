import React, { useState, useMemo } from 'react';
import {
  Check,
  Download,
  FileDown,
  FileJson,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  Share2,
  Calendar,
  Building2,
  Coins,
} from 'lucide-react';
import type { PeriodSelection } from '@/entities/period';
import { accountService } from '@/entities/account/api/account.service';
import {
  Button,
  DatePickerField,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  SafeDiagnosticButton,
} from '@/shared/ui';
import { shareOrDownloadFile, supportsFileShare } from '@/shared/lib';
import { reportService, type FinancialReportFormat } from '../api/report.service';

type ExportFormat = FinancialReportFormat | 'json';

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

const FORMAT_OPTIONS: Array<{
  id: ExportFormat;
  label: string;
  badge?: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'xlsx',
    label: 'Excel (.xlsx)',
    badge: 'Recomendado',
    description: 'Libro contable completo: Resumen ejecutivo + hoja con cada transacción.',
    icon: FileSpreadsheet,
  },
  {
    id: 'csv',
    label: 'CSV (.csv)',
    description: 'Lista plana directa de movimientos para importar o analizar.',
    icon: FileDown,
  },
  {
    id: 'pdf',
    label: 'PDF (.pdf)',
    description: 'Informe ejecutivo visual con comparativa e insights.',
    icon: FileText,
  },
  {
    id: 'json',
    label: 'JSON (.json)',
    description: 'Copia de seguridad completa con todo el historial de la cuenta.',
    icon: FileJson,
  },
];

const BANK_OPTIONS = [
  { value: '', label: 'Todos los bancos' },
  { value: 'BANCO_BHD', label: 'Banco BHD' },
  { value: 'QIK_BANCO_DIGITAL', label: 'Qik Banco Digital' },
  { value: 'BANRESERVAS', label: 'Banreservas' },
  { value: 'CASH', label: 'Manual / Efectivo' },
];

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
          {/* SECCIÓN 1: FILTROS Y ALCANCE */}
          <div className="space-y-3 rounded-2xl border border-border/70 bg-card/60 p-4">
            <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Filter className="h-3.5 w-3.5" /> 1. Alcance y Filtros
            </h4>

            {/* Período */}
            <div>
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5 mb-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                Período a exportar
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPeriodType('current')}
                  className={`rounded-xl py-2 px-2 border transition-all ${
                    periodType === 'current'
                      ? 'border-primary bg-primary/10 text-primary shadow-sm'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {initialPeriod?.label || 'Mes actual'}
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodType('all')}
                  className={`rounded-xl py-2 px-2 border transition-all ${
                    periodType === 'all'
                      ? 'border-primary bg-primary/10 text-primary shadow-sm'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Todo el histórico
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodType('custom')}
                  className={`rounded-xl py-2 px-2 border transition-all ${
                    periodType === 'custom'
                      ? 'border-primary bg-primary/10 text-primary shadow-sm'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Personalizado
                </button>
              </div>

              {periodType === 'custom' && (
                <div className="mt-2.5">
                  <DatePickerField
                    mode="range"
                    value={{ from: customStartDate, to: customEndDate }}
                    onChange={(range) => {
                      setCustomStartDate(range.from);
                      setCustomEndDate(range.to);
                    }}
                    triggerLabel="Seleccionar fechas personalizadas"
                    className="w-full"
                  />
                </div>
              )}
            </div>

            {/* Moneda y Banco */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5 mb-1.5">
                  <Coins className="h-3.5 w-3.5 text-muted-foreground" />
                  Moneda
                </label>
                <div className="flex rounded-xl border border-border bg-background p-1 text-xs font-bold">
                  {['DOP', 'USD'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCurrency(c)}
                      className={`flex-1 rounded-lg py-1.5 transition-colors ${
                        currency === c
                          ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5 mb-1.5">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  Banco
                </label>
                <select
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium"
                >
                  {BANK_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-1">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5 mb-1.5">
                Categoría (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ej. Supermercados, Restaurantes, Servicios..."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs"
              />
            </div>
          </div>

          {/* SECCIÓN 2: FORMATO */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              2. Formato del archivo
            </h4>

            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Formato">
              {FORMAT_OPTIONS.map(({ id, label, badge, description, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={format === id}
                  onClick={() => {
                    setFormat(id);
                    setOutcome(null);
                    setError(null);
                  }}
                  className={`relative flex min-h-[5.5rem] flex-col items-start gap-1 rounded-2xl border p-3 text-left transition-all ${
                    format === id
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm'
                      : 'border-border/70 bg-card hover:bg-muted/40'
                  }`}
                >
                  {badge && (
                    <span className="absolute right-2 top-2 rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-bold text-primary">
                      {badge}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Icon className="h-4 w-4 text-primary" />
                    {label}
                  </span>
                  <span className="text-[11px] leading-snug text-muted-foreground">
                    {description}
                  </span>
                </button>
              ))}
            </div>

            {format !== 'pdf' && format !== 'json' && (
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-border/80 bg-card/40 px-3 transition-colors hover:bg-card">
                <input
                  type="checkbox"
                  checked={includeNotes}
                  onChange={(e) => setIncludeNotes(e.target.checked)}
                  className="h-4 w-4 rounded accent-primary"
                />
                <span className="text-xs">
                  <span className="font-semibold text-foreground">Incluir notas personales</span>
                  <span className="text-muted-foreground block text-[11px]">
                    Desactivado por defecto para compartir seguro.
                  </span>
                </span>
              </label>
            )}
          </div>

          {/* Feedback & Error */}
          {error !== null && (
            <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3" role="alert">
              <p className="text-xs font-semibold text-destructive">No pudimos generar el archivo</p>
              <p className="text-[11px] text-muted-foreground">
                Si el período es muy grande, prueba con un rango más corto o el formato CSV.
              </p>
              <SafeDiagnosticButton error={error} area="exportacion" extra={{ formato: format }} />
            </div>
          )}

          {outcome && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <Check className="h-4 w-4" />
              {outcome === 'shared' ? 'Archivo compartido exitosamente.' : 'Descarga iniciada con éxito.'}
            </div>
          )}

          {/* Botón de acción */}
          <div className="pt-2">
            <Button
              type="button"
              onClick={() => void handleExport()}
              disabled={working}
              className="min-h-12 w-full gap-2 rounded-xl text-sm font-bold shadow-md shadow-primary/10"
            >
              {working ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : canShare ? (
                <Share2 className="h-4 w-4" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {working
                ? 'Generando archivo…'
                : canShare
                ? 'Compartir o descargar archivo'
                : 'Descargar archivo'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
