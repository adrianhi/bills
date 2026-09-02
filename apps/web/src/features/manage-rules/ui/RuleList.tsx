import type { CategoryRuleDto } from '@/entities/category-rule';
import { Button } from '@/shared/ui';
import { useState } from 'react';

export function RuleList({ rules, disabled, onEdit, onToggle, onRemove, onPreview }: {
  rules: CategoryRuleDto[]; disabled: boolean; onEdit: (rule: CategoryRuleDto) => void;
  onToggle: (rule: CategoryRuleDto) => void; onRemove: (rule: CategoryRuleDto) => void; onPreview: (id: string) => void;
}) {
  const [removing, setRemoving] = useState<string | null>(null);
  return <section className="space-y-2"><h3 className="text-sm font-semibold">Reglas ({rules.length})</h3>
    {!rules.length && <p className="rounded-xl border p-4 text-sm text-muted-foreground">Todavía no hay reglas propias. La clasificación del sistema sigue activa.</p>}
    {rules.map((rule) => <article key={rule.id} className="space-y-2 rounded-xl border p-3">
      <p className="break-words text-sm font-semibold">{rule.matchType === 'MERCHANT' ? 'Comercio' : 'Contiene'}: {rule.pattern}</p>
      <p className="text-xs text-muted-foreground">{rule.category}{rule.normalizedMerchant ? ` · Alias: ${rule.normalizedMerchant}` : ''} · {rule.isActive ? 'Activa' : 'Inactiva'}</p>
      <div className="flex flex-wrap gap-1">
        <Button size="sm" variant="outline" disabled={disabled} onClick={() => onEdit(rule)}>Editar</Button>
        <Button size="sm" variant="outline" disabled={disabled} onClick={() => onToggle(rule)}>{rule.isActive ? 'Desactivar' : 'Activar'}</Button>
        <Button size="sm" variant="outline" disabled={disabled || !rule.isActive} onClick={() => onPreview(rule.id)}>Aplicar al histórico</Button>
        <Button size="sm" variant="ghost" disabled={disabled} onClick={() => setRemoving(rule.id)}>Eliminar</Button>
      </div>
      {removing === rule.id && <div className="space-y-2 text-xs"><p>Eliminar la regla no revierte las clasificaciones anteriores.</p>
        <Button size="sm" variant="destructive" disabled={disabled} onClick={() => { onRemove(rule); setRemoving(null); }}>Confirmar eliminación</Button>
        <Button size="sm" variant="ghost" onClick={() => setRemoving(null)}>Cancelar</Button></div>}
    </article>)}
  </section>;
}
