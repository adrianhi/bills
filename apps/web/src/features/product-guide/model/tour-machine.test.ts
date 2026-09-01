import { describe, expect, it } from 'vitest';
import type { TourRect } from '../lib/tour-geometry';
import { initialTourState, tourMachineReducer } from './tour-machine';
import { PRODUCT_TOUR_STEPS } from './tour-steps';

const targetRect: TourRect = {
  top: 120,
  left: 16,
  right: 377,
  bottom: 220,
  width: 361,
  height: 100,
};

describe('product tour machine', () => {
  it('allows only the ordered lifecycle transitions', () => {
    const navigating = tourMachineReducer(initialTourState, { type: 'NAVIGATE' });
    expect(navigating.phase).toBe('navigating');
    expect(tourMachineReducer(navigating, { type: 'SCROLL' })).toBe(navigating);

    const locating = tourMachineReducer(navigating, { type: 'LOCATE' });
    const scrolling = tourMachineReducer(locating, { type: 'SCROLL' });
    const settled = tourMachineReducer(scrolling, {
      type: 'SETTLE',
      rect: targetRect,
      placement: 'top',
    });

    expect(settled).toMatchObject({
      phase: 'settled',
      rect: targetRect,
      placement: 'top',
    });
  });

  it('keeps forward and backward navigation within step boundaries', () => {
    expect(tourMachineReducer(initialTourState, { type: 'BACK' })).toBe(initialTourState);

    let state = initialTourState;
    for (let index = 1; index < PRODUCT_TOUR_STEPS.length; index += 1) {
      state = tourMachineReducer(state, { type: 'NEXT' });
      expect(state.index).toBe(index);
      expect(state.direction).toBe('forward');
    }
    expect(tourMachineReducer(state, { type: 'NEXT' })).toBe(state);

    state = tourMachineReducer(state, { type: 'BACK' });
    expect(state.index).toBe(PRODUCT_TOUR_STEPS.length - 2);
    expect(state.direction).toBe('backward');
  });

  it('skips missing targets and exhausts safely at the final step', () => {
    let state = initialTourState;
    for (let index = 1; index < PRODUCT_TOUR_STEPS.length; index += 1) {
      state = tourMachineReducer(state, { type: 'SKIP_MISSING' });
      expect(state.index).toBe(index);
    }

    const exhausted = tourMachineReducer(state, { type: 'SKIP_MISSING' });
    expect(exhausted).toMatchObject({ exhausted: true, suspended: true });
  });

  it('blocks lifecycle updates while suspended and can resume the same step', () => {
    const suspended = tourMachineReducer(initialTourState, { type: 'SUSPEND' });
    expect(tourMachineReducer(suspended, { type: 'NAVIGATE' })).toBe(suspended);
    expect(tourMachineReducer(suspended, {
      type: 'MEASURE',
      rect: targetRect,
      placement: 'bottom',
    })).toBe(suspended);

    const resumed = tourMachineReducer(suspended, { type: 'RESUME' });
    expect(resumed.suspended).toBe(false);
    expect(tourMachineReducer(resumed, { type: 'NAVIGATE' }).phase).toBe('navigating');
  });
});
