import { Plus, Trash2 } from 'lucide-react';
import type { BudgetCategoryDto } from '@/entities/budget';
import { Button, Input } from '@/shared/ui';

export function BudgetLimitRows(props: {
  categories: BudgetCategoryDto[]; limits: Record<string, string>;
  setLimit: (key: string, value: string) => void; removeLimit: (key: string) => void;
}) {
  const unused = props.categories.filter((item) => !(item.key in props.limits));
  const addFirst = () => { if (unused[0]) props.setLimit(unused[0].key, ''); };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-sm font-bold">Límites por categoría</p><p className="text-xs text-muted-foreground">Añade solo las categorías que quieras controlar.</p></div>
        <Button type="button" size="sm" variant="outline" onClick={addFirst} disabled={!unused.length} className="gap-1"><Plus className="h-4 w-4" />Añadir</Button>
      </div>
      {Object.entries(props.limits).map(([key, value]) => (
        <div key={key} className="grid grid-cols-[minmax(0,1fr)_8.5rem_2.75rem] items-center gap-2">
          <select value={key} onChange={(event) => { props.removeLimit(key); props.setLimit(event.target.value, value); }} className="h-10 min-w-0 rounded-md border bg-background px-3 text-sm">
            <option value={key}>{props.categories.find((item) => item.key === key)?.label || key}</option>
            {unused.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select>
          <Input type="number" min="0.01" step="0.01" value={value} onChange={(event) => props.setLimit(key, event.target.value)} placeholder="0.00" />
          <Button type="button" variant="ghost" size="icon" onClick={() => props.removeLimit(key)} aria-label="Quitar categoría"><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      ))}
      {!Object.keys(props.limits).length && <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">Aún no has agregado límites por categoría.</p>}
    </div>
  );
}
