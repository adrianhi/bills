import { useCallback, useReducer } from 'react';
import type { TourCardPlacement, TourRect } from '../lib/tour-geometry';
import { initialTourState, tourMachineReducer } from './tour-machine';
import { PRODUCT_TOUR_STEPS, type TourSection } from './tour-steps';
import { useTourReducedMotion } from './useTourReducedMotion';
import { useTourStepLifecycle } from './useTourStepLifecycle';
import { useTourTargetObserver } from './useTourTargetObserver';

interface ProductTourControllerOptions {
  activeSection: TourSection;
  onNavigate: (section: TourSection) => void;
}

export function useProductTourController({
  activeSection,
  onNavigate,
}: ProductTourControllerOptions) {
  const [state, dispatch] = useReducer(tourMachineReducer, initialTourState);
  const step = PRODUCT_TOUR_STEPS[state.index];
  const reducedMotion = useTourReducedMotion();
  const cancelWork = useTourStepLifecycle({
    state,
    step,
    activeSection,
    reducedMotion,
    onNavigate,
    dispatch,
  });

  const measure = useCallback((rect: TourRect, placement: TourCardPlacement) => {
    dispatch({ type: 'MEASURE', rect, placement });
  }, []);
  useTourTargetObserver({
    enabled: state.phase === 'settled' && !state.suspended,
    targetId: step.target,
    onMeasure: measure,
  });

  const goForward = useCallback(() => {
    if (state.index >= PRODUCT_TOUR_STEPS.length - 1 || state.suspended) return false;
    dispatch({ type: 'NEXT' });
    return true;
  }, [state.index, state.suspended]);

  const goBackward = useCallback(() => {
    if (state.index <= 0 || state.suspended) return false;
    dispatch({ type: 'BACK' });
    return true;
  }, [state.index, state.suspended]);

  const cancel = useCallback(() => {
    cancelWork();
    dispatch({ type: 'SUSPEND' });
  }, [cancelWork]);
  const resume = useCallback(() => dispatch({ type: 'RESUME' }), []);

  return {
    ...state,
    step,
    settled: state.phase === 'settled',
    goForward,
    goBackward,
    cancel,
    resume,
    totalSteps: PRODUCT_TOUR_STEPS.length,
  };
}
