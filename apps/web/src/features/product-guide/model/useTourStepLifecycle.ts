import { useEffect, type Dispatch } from 'react';
import { settleTourTarget } from '../lib/settle-tour-target';
import { abortableDelay, afterFrames, visibleTourTarget, waitForTourTarget } from '../lib/tour-dom';
import type { TourMachineAction, TourMachineState } from './tour-machine';
import type { TourSection, TourStep } from './tour-steps';
import { useTourCancellation } from './useTourCancellation';

interface TourStepLifecycleOptions {
  state: TourMachineState;
  step: TourStep;
  activeSection: TourSection;
  reducedMotion: boolean;
  onNavigate: (section: TourSection) => void;
  dispatch: Dispatch<TourMachineAction>;
}

export function useTourStepLifecycle({
  state,
  step,
  activeSection,
  reducedMotion,
  onNavigate,
  dispatch,
}: TourStepLifecycleOptions) {
  const { begin, release, cancel } = useTourCancellation();

  useEffect(() => {
    if (state.suspended || state.exhausted || state.phase === 'settled') return;
    const controller = begin();
    const { signal } = controller;

    const run = async () => {
      if (state.phase === 'exiting') {
        if (state.rect && !(await abortableDelay(150, signal))) return;
        if (await afterFrames(2, signal)) dispatch({ type: 'NAVIGATE' });
        return;
      }
      if (state.phase === 'navigating') {
        if (activeSection !== step.section) {
          onNavigate(step.section);
          return;
        }
        if (await afterFrames(2, signal)) dispatch({ type: 'LOCATE' });
        return;
      }
      if (state.phase === 'locating') {
        const target = await waitForTourTarget(step.target, signal);
        if (!target) {
          if (!signal.aborted) dispatch({ type: 'SKIP_MISSING' });
          return;
        }
        if (await afterFrames(2, signal)) dispatch({ type: 'SCROLL' });
        return;
      }
      const target = visibleTourTarget(step.target);
      if (!target) {
        dispatch({ type: 'SKIP_MISSING' });
        return;
      }
      const settled = await settleTourTarget(target, signal, reducedMotion);
      if (settled) dispatch({ type: 'SETTLE', ...settled });
    };

    void run();
    return () => release(controller);
  }, [
    activeSection,
    begin,
    dispatch,
    onNavigate,
    reducedMotion,
    release,
    state.exhausted,
    state.phase,
    state.rect,
    state.suspended,
    step,
  ]);

  return cancel;
}
