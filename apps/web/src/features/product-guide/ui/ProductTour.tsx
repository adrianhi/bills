import { useCallback, useEffect, useRef } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { ProductGuideState } from '@bills/contracts';
import { tourCardPosition } from '../lib/tour-geometry';
import type { TourSection } from '../model/tour-steps';
import { useProductGuide } from '../model/useProductGuide';
import { useProductTourController } from '../model/useProductTourController';
import { useTourEscape } from '../model/useTourEscape';
import { useTourViewport } from '../model/useTourViewport';
import { TourCard } from './TourCard';
import { TourPortal } from './TourPortal';
import { TourSpotlight } from './TourSpotlight';

interface ProductTourProps {
  open: boolean;
  activeSection: TourSection;
  onOpenChange: (open: boolean) => void;
  onNavigate: (section: TourSection) => void;
  onStateChange: (state: ProductGuideState) => void;
}

export function ProductTour({ open, ...props }: ProductTourProps) {
  if (!open) return null;
  return <ActiveProductTour {...props} />;
}

function ActiveProductTour({
  activeSection,
  onOpenChange,
  onNavigate,
  onStateChange,
}: Omit<ProductTourProps, 'open'>) {
  const { saving, error, save } = useProductGuide(onStateChange);
  const viewport = useTourViewport();
  const controller = useProductTourController({ activeSection, onNavigate });
  const closingRef = useRef(false);
  const { cancel, exhausted, goBackward, goForward, resume } = controller;

  const persist = useCallback(async (completed: boolean) => {
    if (closingRef.current) return;
    closingRef.current = true;
    try {
      await save(completed);
      onOpenChange(false);
    } catch {
      resume();
    } finally {
      closingRef.current = false;
    }
  }, [onOpenChange, resume, save]);

  const finish = useCallback((completed: boolean) => {
    cancel();
    void persist(completed);
  }, [cancel, persist]);

  useTourEscape(useCallback(() => finish(false), [finish]));

  useEffect(() => {
    if (exhausted) void persist(true);
  }, [exhausted, persist]);

  const next = useCallback(() => {
    if (!goForward()) finish(true);
  }, [finish, goForward]);
  const skip = useCallback(() => finish(false), [finish]);
  const position = tourCardPosition(controller.rect, controller.placement, viewport);

  return (
    <>
      <TourPortal>
        <TourSpotlight
          open
          rect={controller.rect}
          phase={controller.phase}
          viewport={viewport}
        />
      </TourPortal>
      <DialogPrimitive.Root
        open={controller.settled}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && controller.settled && !saving) skip();
        }}
        modal
      >
        <DialogPrimitive.Portal>
          <TourCard
            step={controller.step}
            index={controller.index}
            total={controller.totalSteps}
            placement={controller.placement}
            position={position}
            direction={controller.direction}
            saving={saving}
            error={error}
            onBack={goBackward}
            onNext={next}
            onSkip={skip}
          />
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
