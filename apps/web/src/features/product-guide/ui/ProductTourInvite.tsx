import type { ProductGuideState } from '@bills/contracts';
import { Compass, Loader2, X } from 'lucide-react';
import { Button, Card, CardContent } from '@/shared/ui';
import { useProductGuide } from '../model/useProductGuide';

interface ProductTourInviteProps {
  open: boolean;
  onStart: () => void;
  onDismiss: () => void;
  onStateChange: (state: ProductGuideState) => void;
}

export function ProductTourInvite({ open, onStart, onDismiss, onStateChange }: ProductTourInviteProps) {
  const guide = useProductGuide(onStateChange);
  if (!open) return null;

  const choose = async (start: boolean) => {
    try {
      await guide.save(false);
      onDismiss();
      if (start) onStart();
    } catch {
      // The mutation exposes the localized error and keeps the invitation open.
    }
  };

  return (
    <Card className="fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] left-3 right-3 z-50 border-primary/25 bg-card/95 shadow-2xl backdrop-blur-xl sm:left-auto sm:right-6 sm:max-w-sm lg:bottom-6" role="region" aria-label="Invitación al recorrido">
      <CardContent className="flex gap-3 p-4 pr-10">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Compass className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">¿Quieres un recorrido rápido?</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Te mostramos cada sección en menos de un minuto. No cambiaremos ningún dato.</p>
          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" className="min-h-11 flex-1" disabled={guide.saving} onClick={() => void choose(true)}>{guide.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ver recorrido'}</Button>
            <Button size="sm" variant="ghost" className="min-h-11" disabled={guide.saving} onClick={() => void choose(false)}>Saltar</Button>
          </div>
          {guide.error && <p role="alert" className="mt-2 text-[11px] text-destructive">{guide.error}</p>}
        </div>
      </CardContent>
      <button type="button" aria-label="Saltar recorrido" disabled={guide.saving} onClick={() => void choose(false)} className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
    </Card>
  );
}
