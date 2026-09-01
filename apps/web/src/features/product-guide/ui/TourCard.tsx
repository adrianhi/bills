import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ArrowLeft, ArrowRight, Loader2, X } from 'lucide-react';
import { Button } from '@/shared/ui';
import type { TourCardPlacement, TourCardPosition } from '../lib/tour-geometry';
import type { TourDirection, TourStep } from '../model/tour-steps';
import { useTourCardFocus } from '../model/useTourCardFocus';

interface TourCardProps {
  step: TourStep;
  index: number;
  total: number;
  placement: TourCardPlacement;
  position?: TourCardPosition;
  direction: TourDirection;
  saving: boolean;
  error: string;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}

export function TourCard({
  step,
  index,
  total,
  placement,
  position,
  direction,
  saving,
  error,
  onBack,
  onNext,
  onSkip,
}: TourCardProps) {
  const nextButtonRef = useTourCardFocus(index);
  const mobilePosition = placement === 'top'
    ? 'top-[calc(0.75rem+env(safe-area-inset-top))] bottom-auto sm:top-auto sm:bottom-auto'
    : 'bottom-[calc(0.75rem+env(safe-area-inset-bottom))] top-auto sm:top-auto sm:bottom-auto';

  return (
    <DialogPrimitive.Content
      className={`fixed left-3 right-3 z-[72] max-h-[calc(100dvh-1.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] overflow-y-auto rounded-3xl border border-white/20 bg-card/95 p-5 text-card-foreground shadow-2xl backdrop-blur-xl [animation-timing-function:cubic-bezier(0.22,1,0.36,1)] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:[animation-duration:150ms] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:[animation-duration:220ms] motion-reduce:animate-none sm:left-auto sm:right-auto sm:max-h-[calc(100dvh-2rem)] ${mobilePosition}`}
      style={position}
      onOpenAutoFocus={(event) => event.preventDefault()}
      onPointerDownOutside={(event) => event.preventDefault()}
      onInteractOutside={(event) => event.preventDefault()}
      data-product-tour-card
    >
      <div key={step.target} className={`animate-in fade-in-0 [animation-duration:220ms] [animation-timing-function:cubic-bezier(0.22,1,0.36,1)] motion-reduce:animate-none ${direction === 'forward' ? 'slide-in-from-right-3' : 'slide-in-from-left-3'}`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary" aria-live="polite">Paso {index + 1} de {total}</span>
          <button type="button" onClick={onSkip} disabled={saving} className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground motion-reduce:transition-none" aria-label="Saltar recorrido"><X className="h-4 w-4" /></button>
        </div>
        <DialogPrimitive.Title className="text-lg font-black tracking-tight">{step.title}</DialogPrimitive.Title>
        <DialogPrimitive.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</DialogPrimitive.Description>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <div className="h-full rounded-full bg-primary transition-[width] [transition-duration:220ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none" style={{ width: `${((index + 1) / total) * 100}%` }} />
        </div>
        {error && <p role="alert" className="mt-3 text-xs text-destructive">{error}</p>}
        <div className="mt-5 flex items-center gap-2">
          <Button type="button" variant="ghost" className="min-h-11" disabled={index === 0 || saving} onClick={onBack}><ArrowLeft className="h-4 w-4" />Atrás</Button>
          <Button ref={nextButtonRef} type="button" className="min-h-11 flex-1 gap-2" disabled={saving} onClick={onNext}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : index === total - 1 ? 'Terminar' : <>Siguiente<ArrowRight className="h-4 w-4" /></>}
          </Button>
        </div>
        <button type="button" className="mt-2 min-h-11 w-full text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground motion-reduce:transition-none" disabled={saving} onClick={onSkip}>Saltar recorrido</button>
      </div>
    </DialogPrimitive.Content>
  );
}
