import type { ComponentType } from 'react';
import {
  FileDown,
  FileJson,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import type { FinancialReportFormat, FinancialReportSection } from '../api/report.service';

export type ExportFormat = FinancialReportFormat | 'json';

export interface FormatOption {
  id: ExportFormat;
  label: string;
  badge?: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}

export const FORMAT_OPTIONS: FormatOption[] = [
  {
    id: 'xlsx',
    label: 'Excel (.xlsx)',
    badge: 'Recomendado',
    description:
      'Libro personalizable con resumen, desgloses y movimientos detallados.',
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
    description: 'Informe ejecutivo visual con métricas, gráficos y anexo paginado.',
    icon: FileText,
  },
  {
    id: 'json',
    label: 'JSON (.json)',
    description:
      'Copia de seguridad completa con todo el historial de la cuenta.',
    icon: FileJson,
  },
];

export const REPORT_SECTION_OPTIONS: Array<{ id: FinancialReportSection; label: string }> = [
  { id: 'summary', label: 'Resumen ejecutivo' },
  { id: 'comparison', label: 'Comparación' },
  { id: 'categories', label: 'Categorías' },
  { id: 'merchants', label: 'Comercios' },
  { id: 'movements', label: 'Movimientos' },
  { id: 'budget', label: 'Presupuesto' },
];

export type ExportPeriodPreset = 'current' | '3m' | '6m' | 'all' | 'custom' | 'last3' | 'last6';
export type ExportPeriodType = ExportPeriodPreset | 'last_3_months' | 'last_6_months';

export interface ExportPeriodPresetOption {
  id: ExportPeriodPreset;
  label: string;
}

export const EXPORT_PERIOD_PRESETS: ExportPeriodPresetOption[] = [
  { id: 'current', label: 'Mes actual' },
  { id: '3m', label: 'Últimos 3 meses' },
  { id: '6m', label: 'Últimos 6 meses' },
  { id: 'all', label: 'Todo el histórico' },
  { id: 'custom', label: 'Personalizado' },
];

export function currentReportDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santo_Domingo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
}
