import { Download, HelpCircle, Lock, Moon, SlidersHorizontal, Sun } from 'lucide-react';
import { Button } from '@/shared/ui';

export function AccountToolsSection(props: {
  darkMode: boolean; setDarkMode: (value: boolean) => void;
  onRepeatTour: () => void; onOpenRules: () => void; onOpenExport: () => void; onLock: () => void;
}) {
  const tools = [
    { label: 'Reglas de categorías', description: 'Automatiza cómo se organizan tus gastos.', icon: SlidersHorizontal, action: props.onOpenRules },
    { label: 'Exportar datos', description: 'Crea reportes o descarga tu cuenta completa.', icon: Download, action: props.onOpenExport },
    { label: 'Repetir recorrido', description: 'Vuelve a conocer las funciones principales.', icon: HelpCircle, action: props.onRepeatTour },
  ];
  return (
    <section className="space-y-3 rounded-2xl border p-4">
      <div><p className="font-bold">Herramientas y apariencia</p><p className="text-xs text-muted-foreground">Acciones menos frecuentes de tu cuenta.</p></div>
      <div className="grid gap-2 sm:grid-cols-2">
        {tools.map(({ label, description, icon: Icon, action }) => <Button key={label} variant="outline" onClick={action} className="h-auto min-h-16 justify-start gap-3 p-3 text-left"><Icon className="h-4 w-4 shrink-0 text-primary" /><span><span className="block text-xs font-bold">{label}</span><span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">{description}</span></span></Button>)}
        <Button variant="outline" onClick={() => props.setDarkMode(!props.darkMode)} className="h-auto min-h-16 justify-start gap-3 p-3 text-left">{props.darkMode ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-indigo-500" />}<span><span className="block text-xs font-bold">{props.darkMode ? 'Usar tema claro' : 'Usar tema oscuro'}</span><span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">Cambia la apariencia de bills.</span></span></Button>
      </div>
      <Button variant="ghost" onClick={props.onLock} className="w-full gap-2 text-muted-foreground"><Lock className="h-4 w-4" />Cerrar sesión</Button>
    </section>
  );
}
