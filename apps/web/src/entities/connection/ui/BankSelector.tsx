import { Check, Landmark } from 'lucide-react';
import type { Institution } from '../api/connection.service';

interface BankSelectorProps {
  institutions: Institution[];
  selectedCodes: string[];
  onChange: (codes: string[]) => void;
  disabled?: boolean;
}

export function BankSelector({ institutions, selectedCodes, onChange, disabled = false }: BankSelectorProps) {
  const selected = new Set(selectedCodes);
  const toggle = (institution: Institution) => {
    if (disabled || !institution.selectable) return;
    onChange(selected.has(institution.code)
      ? selectedCodes.filter((code) => code !== institution.code)
      : [...selectedCodes, institution.code]);
  };

  return (
    <fieldset disabled={disabled} className="space-y-2">
      <legend className="mb-2 text-sm font-semibold">¿Qué bancos quieres importar?</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {institutions.map((institution) => {
          const available = institution.selectable;
          const checked = selected.has(institution.code);
          return (
            <label
              key={institution.code}
              className={`flex min-h-14 items-center gap-3 rounded-xl border p-3 transition-colors ${
                available ? 'cursor-pointer hover:border-primary/40' : 'cursor-not-allowed opacity-50'
              } ${checked ? 'border-primary/50 bg-primary/10' : 'bg-background'}`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled || !available}
                onChange={() => toggle(institution)}
                className="sr-only"
              />
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${checked ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {checked ? <Check className="h-4 w-4" aria-hidden="true" /> : <Landmark className="h-4 w-4" aria-hidden="true" />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{institution.displayName}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {available
                    ? institution.status === 'ACTIVE' ? 'Disponible' : 'Piloto'
                    : institution.status === 'COMING_SOON' ? 'Próximamente' : 'No disponible'}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      {selectedCodes.length === 0 && <p className="text-xs text-amber-600 dark:text-amber-400">Selecciona al menos un banco para conectar Gmail.</p>}
    </fieldset>
  );
}
