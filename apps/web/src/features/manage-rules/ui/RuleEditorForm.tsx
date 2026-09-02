import type { FormEvent } from 'react';
import { Button, Input } from '@/shared/ui';
import type { useRulesManager } from '../model/useRulesManager';

export function RuleEditorForm({ model, disabled, onSaved }: {
  model: ReturnType<typeof useRulesManager>; disabled: boolean; onSaved: (id: string) => void;
}) {
  const { draft, setDraft } = model;
  const field = (key: keyof typeof draft, value: string) => setDraft((old) => ({ ...old, [key]: value }));
  async function submit(event: FormEvent) {
    event.preventDefault();
    const rule = await model.save();
    if (rule) onSaved(rule.id);
  }
  const selectClass = 'h-10 w-full rounded-md border bg-background px-3 text-sm';
  return <form onSubmit={(event) => void submit(event)} className="space-y-3 rounded-xl border bg-muted/30 p-4">
    <div className="flex items-center justify-between"><h3 className="font-semibold">{model.editing ? 'Editar regla' : 'Nueva regla'}</h3>
      {model.editing && <Button type="button" variant="ghost" size="sm" onClick={model.reset}>Nueva</Button>}</div>
    <label className="block text-sm">Coincidencia<select aria-label="Coincidencia" className={selectClass} value={draft.matchType}
      onChange={(event) => field('matchType', event.target.value)}><option value="MERCHANT">Este comercio</option><option value="CONTAINS">El texto contiene…</option></select></label>
    {draft.matchType === 'MERCHANT' ? <div className="space-y-2">
      <Input aria-label="Buscar comercio" placeholder="Buscar comercio" value={model.search} onChange={(event) => model.setSearch(event.target.value)} />
      <select aria-label="Comercio exacto" className={selectClass} value={draft.merchantKey || ''} onChange={(event) => field('merchantKey', event.target.value)}>
        <option value="">Selecciona un comercio</option>{model.merchants.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select>
      <p className="text-xs text-muted-foreground">El nombre visible no cambia esta identidad. Uber Viajes y Uber Eats son comercios distintos.</p>
    </div> : <div className="space-y-2"><Input aria-label="Texto del patrón" maxLength={60} placeholder="Ej. FARMACIA CAROL" value={draft.pattern} onChange={(event) => field('pattern', event.target.value)} />
      <p className="text-xs text-amber-700 dark:text-amber-300">Una coincidencia amplia puede afectar a varios comercios. “UBER” también coincide con Uber Eats. Revisa la vista previa.</p></div>}
    <label className="block text-sm">Categoría<select aria-label="Categoría de la regla" className={selectClass} value={draft.category}
      onChange={(event) => field('category', event.target.value)}><option value="">Selecciona una categoría</option>
      {model.categories.map((item) => <option key={item.key} value={item.label}>{item.label}</option>)}</select></label>
    <label className="block text-sm">Nombre visible opcional<Input aria-label="Nombre visible opcional" value={draft.normalizedMerchant || ''}
      maxLength={60} placeholder="Dejar vacío para conservar el nombre" onChange={(event) => field('normalizedMerchant', event.target.value)} /></label>
    <p className="text-xs text-muted-foreground">Guardar afecta a movimientos futuros. Para el histórico, genera y confirma una vista previa.</p>
    <Button type="submit" disabled={disabled || model.pending || model.loading}>{model.pending ? 'Guardando…' : 'Guardar regla'}</Button>
  </form>;
}
