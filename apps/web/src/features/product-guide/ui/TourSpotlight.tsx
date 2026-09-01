import { Loader2 } from 'lucide-react';
import { paddedRect, type TourRect, type TourViewport } from '../lib/tour-geometry';
import type { TourPhase } from '../model/tour-steps';

interface TourSpotlightProps {
  open: boolean;
  rect: TourRect | null;
  phase: TourPhase;
  viewport: TourViewport;
}

const geometryTransition = 'transition-[top,left,right,bottom,width,height,opacity,background-color,box-shadow] [transition-duration:220ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none';

export function TourSpotlight({ open, rect, phase, viewport }: TourSpotlightProps) {
  if (!open) return null;
  const focusRect = rect ? paddedRect(rect, viewport) : null;
  const transitioning = phase !== 'settled';

  return (
    <div className="fixed inset-0 z-[69] animate-in fade-in-0 [animation-duration:220ms] [animation-timing-function:cubic-bezier(0.22,1,0.36,1)] motion-reduce:animate-none" data-product-tour-phase={phase}>
      {focusRect ? (
        <>
          <div className={`pointer-events-auto fixed bg-black/65 ${geometryTransition}`} style={{ left: viewport.left, right: 0, top: viewport.top, height: Math.max(0, focusRect.top - viewport.top) }} />
          <div className={`pointer-events-auto fixed bg-black/65 ${geometryTransition}`} style={{ left: viewport.left, right: 0, top: focusRect.bottom, bottom: 0 }} />
          <div className={`pointer-events-auto fixed bg-black/65 ${geometryTransition}`} style={{ left: viewport.left, top: focusRect.top, width: Math.max(0, focusRect.left - viewport.left), height: focusRect.height }} />
          <div className={`pointer-events-auto fixed bg-black/65 ${geometryTransition}`} style={{ left: focusRect.right, right: 0, top: focusRect.top, height: focusRect.height }} />
          <div
            className={`pointer-events-auto fixed rounded-[1.25rem] border-2 border-primary ${geometryTransition} ${transitioning ? 'opacity-60' : 'opacity-100 shadow-[0_0_0_4px_hsl(var(--primary)/0.22),0_0_36px_hsl(var(--primary)/0.35)]'}`}
            style={{ top: focusRect.top, left: focusRect.left, width: focusRect.width, height: focusRect.height }}
            aria-hidden="true"
          />
        </>
      ) : (
        <div className="pointer-events-auto fixed inset-0 bg-black/65 transition-opacity duration-200 motion-reduce:transition-none" />
      )}
      <div className={`pointer-events-none fixed inset-0 flex items-center justify-center transition-opacity duration-150 motion-reduce:transition-none ${transitioning ? 'opacity-100' : 'opacity-0'}`}>
        <span className="flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-3 py-2 text-xs font-semibold text-white/90 backdrop-blur-md">
          <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" /> Preparando paso…
        </span>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {transitioning ? 'Preparando el siguiente paso del recorrido.' : 'Paso listo.'}
      </p>
    </div>
  );
}
