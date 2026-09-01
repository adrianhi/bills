import type { FinancialReportSection } from '../api/report.service';
import { REPORT_SECTION_OPTIONS, type ExportFormat } from '../model/export-options';

interface Props {
  format: ExportFormat;
  title: string; setTitle: (value: string) => void;
  sections: FinancialReportSection[]; setSections: (value: FinancialReportSection[]) => void;
  includeNotes: boolean; setIncludeNotes: (value: boolean) => void;
}

export function ExportCustomizationFields({ format, title, setTitle, sections, setSections, includeNotes, setIncludeNotes }: Props) {
  if (format === 'json') return (
    <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-xs text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200">
      <p className="font-bold">Copia completa de la cuenta</p>
      <p className="mt-1">JSON incluye todos los datos disponibles y no utiliza los filtros ni la personalización del informe.</p>
    </div>
  );
  const rich = format === 'pdf' || format === 'xlsx';
  const toggle = (section: FinancialReportSection) => setSections(
    sections.includes(section) ? sections.filter((item) => item !== section) : [...sections, section],
  );
  return (
    <div className="space-y-3 rounded-2xl border border-border/70 bg-card/60 p-4">
      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">3. Personalización</h4>
      {rich && (
        <>
          <label className="block text-xs font-medium">Título del informe
            <input maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Informe financiero"
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs" />
          </label>
          <fieldset>
            <legend className="mb-1.5 text-xs font-medium">Secciones incluidas</legend>
            <div className="grid grid-cols-2 gap-1.5">
              {REPORT_SECTION_OPTIONS.map((option) => (
                <label key={option.id} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-2 text-xs">
                  <input type="checkbox" checked={sections.includes(option.id)} onChange={() => toggle(option.id)} className="accent-emerald-600" />{option.label}
                </label>
              ))}
            </div>
            {sections.length === 0 && <p className="mt-1.5 text-xs text-destructive">Selecciona al menos una sección.</p>}
          </fieldset>
        </>
      )}
      <label className="flex cursor-pointer items-start gap-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={includeNotes} onChange={(event) => setIncludeNotes(event.target.checked)} className="mt-0.5 accent-emerald-600" />
        <span><strong className="text-foreground">Incluir notas</strong> · pueden contener información sensible.</span>
      </label>
    </div>
  );
}
