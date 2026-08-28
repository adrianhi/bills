import type { ComponentType } from 'react';
import { Check } from 'lucide-react';

interface Option { id: string; label: string; icon?: ComponentType<{ className?: string }>; dot?: string }

export const FilterOptionSection = ({ title, options, selected, onSelect, columns = 'grid-cols-2' }: { title: string; options: Option[]; selected: string; onSelect: (value: string) => void; columns?: string }) => (
  <section className="space-y-2.5">
    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h4>
    <div className={`grid gap-2 ${columns}`}>
      {options.map((option) => {
        const active = selected === option.id;
        const Icon = option.icon;
        return <button key={option.id} type="button" onClick={() => onSelect(option.id)} className={`flex cursor-pointer items-center gap-2 truncate rounded-xl border p-2.5 text-left text-xs font-medium transition-all ${active ? 'border-emerald-500 bg-emerald-500/15 font-bold text-emerald-600 shadow-sm dark:text-emerald-400' : 'border-border/60 bg-muted/20 text-foreground hover:bg-muted/50'}`}>
          {option.dot && <span className={`h-2.5 w-2.5 rounded-full ${option.dot}`} />}{Icon && <Icon className={`h-3.5 w-3.5 ${active ? 'text-emerald-500' : 'text-muted-foreground'}`} />}<span className="truncate">{option.label}</span>{active && <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-emerald-500" />}
        </button>;
      })}
    </div>
  </section>
);
