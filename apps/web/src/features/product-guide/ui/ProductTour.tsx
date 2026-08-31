import { useCallback, useEffect, useRef } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { ProductGuideState } from '@bills/contracts';
import { useProductGuide } from '../model/useProductGuide';
import { useProductTourController } from '../model/useProductTourController';
import type { TourSection } from '../model/tour-steps';
import { TourCard } from './TourCard';
import { TourSpotlight } from './TourSpotlight';

interface ProductTourProps {
  open: boolean;
  activeSection: TourSection;
  onOpenChange: (open: boolean) => void;
  onNavigate: (section: TourSection) => void;
  onStateChange: (state: ProductGuideState) => void;
}

export function ProductTour({
  open,
  ...props
}: ProductTourProps) {
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
  const closingRef = useRef(false);
  const exhaustedRef = useRef<() => void>(() => undefined);

  const controller = useProductTourController({
    open: true,
    activeSection,
    onNavigate,
    onExhausted: () => exhaustedRef.current(),
  });
  const { cancel } = controller;

  const finish = useCallback(async (completed: boolean) => {
    if (closingRef.current) return;
    closingRef.current = true;
    cancel();
    try {
      await save(completed);
      onOpenChange(false);
    } catch {
      // Keep the settled step visible so the user can retry.
    } finally {
      closingRef.current = false;
    }
  }, [cancel, onOpenChange, save]);

  useEffect(() => {
    exhaustedRef.current = () => void finish(true);
  }, [finish]);

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      void finish(false);
    };
    document.addEventListener('keydown', onEscape, true);
    return () => document.removeEventListener('keydown', onEscape, true);
  }, [finish]);

  const next = () => {
    if (!controller.goForward()) void finish(true);
  };
  const skip = () => void finish(false);

  return (
    <>
      <TourSpotlight open rect={controller.rect} phase={controller.phase} />
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
            rect={controller.rect}
            placement={controller.placement}
            direction={controller.direction}
            saving={saving}
            error={error}
            onBack={controller.goBackward}
            onNext={next}
            onSkip={skip}
          />
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
