import { useCallback, useEffect, useRef, useState } from 'react';
import { animateTourScroll } from '../lib/animate-tour-scroll';
import {
  abortableDelay,
  afterFrames,
  hasFixedAncestor,
  measuredOccluders,
  measuredTarget,
  viewportMetrics,
  visibleTourTarget,
  waitForTourTarget,
} from '../lib/tour-dom';
import {
  cardPlacement,
  isFullyVisible,
  scrollDestination,
  verticalBounds,
  type TourCardPlacement,
  type TourRect,
} from '../lib/tour-geometry';
import {
  PRODUCT_TOUR_STEPS,
  type TourDirection,
  type TourPhase,
  type TourSection,
} from './tour-steps';

interface ProductTourControllerOptions {
  open: boolean;
  activeSection: TourSection;
  onNavigate: (section: TourSection) => void;
  onExhausted: () => void;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useProductTourController({
  open,
  activeSection,
  onNavigate,
  onExhausted,
}: ProductTourControllerOptions) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<TourPhase>('idle');
  const [direction, setDirection] = useState<TourDirection>('forward');
  const [rect, setRect] = useState<TourRect | null>(null);
  const [placement, setPlacement] = useState<TourCardPlacement>('bottom');
  const sectionRef = useRef(activeSection);
  const navigateRef = useRef(onNavigate);
  const exhaustedRef = useRef(onExhausted);
  const rectRef = useRef<TourRect | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const step = PRODUCT_TOUR_STEPS[index];

  useEffect(() => { sectionRef.current = activeSection; }, [activeSection]);
  useEffect(() => { navigateRef.current = onNavigate; }, [onNavigate]);
  useEffect(() => { exhaustedRef.current = onExhausted; }, [onExhausted]);
  useEffect(() => { rectRef.current = rect; }, [rect]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    const { signal } = controller;

    const waitForSection = async (section: TourSection) => {
      for (let attempt = 0; attempt < 90 && !signal.aborted; attempt += 1) {
        if (sectionRef.current === section) return true;
        if (!(await afterFrames(1, signal))) return false;
      }
      return false;
    };

    const revealStep = async () => {
      setPhase('exiting');
      if (rectRef.current && !(await abortableDelay(150, signal))) return;
      if (!(await afterFrames(2, signal))) return;

      setPhase('navigating');
      if (sectionRef.current !== step.section) {
        navigateRef.current(step.section);
        if (!(await waitForSection(step.section))) return;
      }

      setPhase('locating');
      const target = await waitForTourTarget(step.target, signal);
      if (!target || signal.aborted) {
        if (!signal.aborted && index < PRODUCT_TOUR_STEPS.length - 1) {
          setIndex((current) => current + 1);
        } else if (!signal.aborted) {
          exhaustedRef.current();
        }
        return;
      }
      if (!(await afterFrames(2, signal))) return;

      setPhase('scrolling');
      const viewport = viewportMetrics();
      const bounds = verticalBounds(viewport, measuredOccluders());
      let targetRect = measuredTarget(target);
      const fixed = hasFixedAncestor(target);
      if (!fixed && !isFullyVisible(targetRect, bounds)) {
        const destination = scrollDestination(
          window.scrollY,
          document.documentElement.scrollHeight,
          window.innerHeight,
          targetRect,
          bounds
        );
        if (!(await animateTourScroll(destination, { signal, reducedMotion: prefersReducedMotion() }))) return;
      }
      if (!(await afterFrames(2, signal))) return;

      targetRect = measuredTarget(target);
      const correctedViewport = viewportMetrics();
      const correctedBounds = verticalBounds(correctedViewport, measuredOccluders());
      if (!fixed && !isFullyVisible(targetRect, correctedBounds)) {
        const correction = scrollDestination(
          window.scrollY,
          document.documentElement.scrollHeight,
          window.innerHeight,
          targetRect,
          correctedBounds
        );
        if (!(await animateTourScroll(correction, {
          signal,
          reducedMotion: prefersReducedMotion(),
          duration: 180,
        }))) return;
        if (!(await afterFrames(2, signal))) return;
        targetRect = measuredTarget(target);
      }

      const finalViewport = viewportMetrics();
      setRect(targetRect);
      setPlacement(cardPlacement(targetRect, finalViewport));
      setPhase('settled');
    };

    void revealStep();
    return () => controller.abort();
  }, [index, open, step.section, step.target]);

  useEffect(() => {
    if (!open || phase !== 'settled') return;
    const target = visibleTourTarget(step.target);
    if (!target) return;
    const update = () => {
      const nextRect = measuredTarget(target);
      setRect(nextRect);
      setPlacement(cardPlacement(nextRect, viewportMetrics()));
    };
    const observer = new ResizeObserver(update);
    observer.observe(target);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, [open, phase, step.target]);

  const goForward = useCallback(() => {
    if (index >= PRODUCT_TOUR_STEPS.length - 1) return false;
    setDirection('forward');
    setPhase('exiting');
    setIndex((current) => current + 1);
    return true;
  }, [index]);

  const goBackward = useCallback(() => {
    if (index <= 0) return false;
    setDirection('backward');
    setPhase('exiting');
    setIndex((current) => current - 1);
    return true;
  }, [index]);

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  return {
    index,
    step,
    phase,
    direction,
    rect,
    placement,
    settled: phase === 'settled',
    goForward,
    goBackward,
    cancel,
    totalSteps: PRODUCT_TOUR_STEPS.length,
  };
}
