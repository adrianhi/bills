import type { TourCardPlacement, TourRect } from '../lib/tour-geometry';
import { PRODUCT_TOUR_STEPS, type TourDirection, type TourPhase } from './tour-steps';

export interface TourMachineState {
  index: number;
  phase: TourPhase;
  direction: TourDirection;
  rect: TourRect | null;
  placement: TourCardPlacement;
  suspended: boolean;
  exhausted: boolean;
}

export type TourMachineAction =
  | { type: 'NAVIGATE' }
  | { type: 'LOCATE' }
  | { type: 'SCROLL' }
  | { type: 'SETTLE'; rect: TourRect; placement: TourCardPlacement }
  | { type: 'MEASURE'; rect: TourRect; placement: TourCardPlacement }
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'SKIP_MISSING' }
  | { type: 'SUSPEND' }
  | { type: 'RESUME' };

export const initialTourState: TourMachineState = {
  index: 0,
  phase: 'exiting',
  direction: 'forward',
  rect: null,
  placement: 'bottom',
  suspended: false,
  exhausted: false,
};

const lastStepIndex = PRODUCT_TOUR_STEPS.length - 1;

function changePhase(
  state: TourMachineState,
  expected: TourPhase,
  phase: TourPhase
): TourMachineState {
  return state.phase === expected && !state.suspended ? { ...state, phase } : state;
}

function move(state: TourMachineState, index: number, direction: TourDirection): TourMachineState {
  return {
    ...state,
    index,
    direction,
    phase: 'exiting',
    suspended: false,
    exhausted: false,
  };
}

export function tourMachineReducer(
  state: TourMachineState,
  action: TourMachineAction
): TourMachineState {
  switch (action.type) {
    case 'NAVIGATE': return changePhase(state, 'exiting', 'navigating');
    case 'LOCATE': return changePhase(state, 'navigating', 'locating');
    case 'SCROLL': return changePhase(state, 'locating', 'scrolling');
    case 'SETTLE':
      if (state.phase !== 'scrolling' || state.suspended) return state;
      return { ...state, phase: 'settled', rect: action.rect, placement: action.placement };
    case 'MEASURE':
      if (state.phase !== 'settled' || state.suspended) return state;
      return { ...state, rect: action.rect, placement: action.placement };
    case 'NEXT':
      return state.index < lastStepIndex && !state.suspended
        ? move(state, state.index + 1, 'forward')
        : state;
    case 'BACK':
      return state.index > 0 && !state.suspended
        ? move(state, state.index - 1, 'backward')
        : state;
    case 'SKIP_MISSING':
      return state.index < lastStepIndex
        ? move(state, state.index + 1, 'forward')
        : { ...state, suspended: true, exhausted: true };
    case 'SUSPEND': return state.suspended ? state : { ...state, suspended: true };
    case 'RESUME': return state.suspended ? { ...state, suspended: false } : state;
  }
}
