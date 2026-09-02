import { useRef, useState, useEffect } from 'react';
import { ChevronDown, Check, Plus, Trash2 } from 'lucide-react';
import type { BudgetCategoryDto } from '@/entities/budget';
import { Button, Input } from '@/shared/ui';
import { formatAmountInput } from '@/shared/lib';

function CategorySelect(props: {
  selectedKey: string;
  categories: BudgetCategoryDto[];
  unusedCategories: BudgetCategoryDto[];
  onChange: (newKey: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const currentCategory = props.categories.find((c) => c.key === props.selectedKey);
  const label = currentCategory?.label || props.selectedKey;

  const options = [
    ...(currentCategory ? [currentCategory] : []),
    ...props.unusedCategories.filter((c) => c.key !== props.selectedKey),
  ];

  return (
    <div ref={ref} className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-input/60 bg-muted/30 px-3 text-left text-xs font-semibold text-foreground shadow-sm transition-all hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-56 w-full min-w-[13rem] overflow-y-auto rounded-2xl border border-border/80 bg-popover/95 p-1.5 shadow-2xl backdrop-blur-md">
          {options.map((item) => {
            const isSelected = item.key === props.selectedKey;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  props.onChange(item.key);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-primary/15 font-bold text-primary'
                    : 'text-foreground hover:bg-muted/80'
                }`}
              >
                <span className="truncate">{item.label}</span>
                {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function BudgetLimitRows(props: {
  categories: BudgetCategoryDto[];
  limits: Record<string, string>;
  setLimit: (key: string, value: string) => void;
  removeLimit: (key: string) => void;
}) {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const unused = props.categories.filter((item) => !(item.key in props.limits));

  const addFirst = () => {
    if (unused[0]) {
      const nextKey = unused[0].key;
      props.setLimit(nextKey, '');
      setTimeout(() => {
        inputRefs.current[nextKey]?.focus();
      }, 50);
      return nextKey;
    }
    return null;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold">Límites por categoría</p>
          <p className="text-xs text-muted-foreground">Añade solo las categorías que quieras controlar.</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addFirst}
          disabled={!unused.length}
          className="gap-1 rounded-xl text-xs font-semibold"
        >
          <Plus className="h-3.5 w-3.5" />
          Añadir
        </Button>
      </div>

      {Object.entries(props.limits).map(([key, value]) => (
        <div key={key} className="flex items-center gap-2">
          <CategorySelect
            selectedKey={key}
            categories={props.categories}
            unusedCategories={unused}
            onChange={(newKey) => {
              props.removeLimit(key);
              props.setLimit(newKey, value);
            }}
          />
          <div className="w-32 shrink-0 sm:w-36">
            <Input
              ref={(el) => {
                inputRefs.current[key] = el;
              }}
              type="text"
              inputMode="decimal"
              value={value}
              onChange={(event) => {
                const formatted = formatAmountInput(event.target.value);
                props.setLimit(key, formatted);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addFirst();
                }
              }}
              placeholder="0.00"
              className="h-10 text-right font-mono text-xs font-semibold"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => props.removeLimit(key)}
            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
            aria-label="Quitar categoría"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      {!Object.keys(props.limits).length && (
        <p className="rounded-2xl border border-dashed p-4 text-center text-xs text-muted-foreground">
          Aún no has agregado límites por categoría.
        </p>
      )}
    </div>
  );
}
