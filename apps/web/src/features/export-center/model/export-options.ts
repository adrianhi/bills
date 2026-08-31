import type { ComponentType } from 'react';
import {
  FileDown,
  FileJson,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import type { FinancialReportFormat } from '../api/report.service';

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
      'Libro contable completo: Resumen ejecutivo + hoja "Movimientos" con cada transacción individual.',
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
    description: 'Informe ejecutivo visual con gráficos e insights.',
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

export const BANK_OPTIONS = [
  { value: '', label: 'Todos los bancos' },
  { value: 'BANCO_BHD', label: 'Banco BHD' },
  { value: 'QIK_BANCO_DIGITAL', label: 'Qik Banco Digital' },
  { value: 'BANRESERVAS', label: 'Banreservas' },
  { value: 'CASH', label: 'Manual / Efectivo' },
];
