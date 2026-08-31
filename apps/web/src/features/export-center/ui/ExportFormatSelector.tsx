import React from 'react';
import { Check } from 'lucide-react';
import { FORMAT_OPTIONS, type ExportFormat } from '../model/export-options';

interface ExportFormatSelectorProps {
  format: ExportFormat;
  setFormat: (fmt: ExportFormat) => void;
  includeNotes: boolean;
  setIncludeNotes: (inc: boolean) => void;
}

export const ExportFormatSelector: React.FC<ExportFormatSelectorProps> = ({
  format,
  setFormat,
  includeNotes,
  setIncludeNotes,
}) => {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        2. Formato del archivo
      </h4>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {FORMAT_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isSelected = format === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setFormat(opt.id)}
              className={`flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30'
                  : 'border-border bg-card hover:bg-muted/40'
              }`}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-bold text-foreground">
                    {opt.label}
                  </span>
                </div>
                {opt.badge && (
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                    {opt.badge}
                  </span>
                )}
                {isSelected && !opt.badge && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {opt.description}
              </p>
            </button>
          );
        })}
      </div>

      {format !== 'pdf' && (
        <label className="flex items-center gap-2 pt-1 text-xs text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeNotes}
            onChange={(e) => setIncludeNotes(e.target.checked)}
            className="rounded border-border text-primary focus:ring-primary h-4 w-4"
          />
          <span>
            Incluir notas personales de movimientos (desactivado por defecto
            para compartir con seguridad).
          </span>
        </label>
      )}
    </div>
  );
};
