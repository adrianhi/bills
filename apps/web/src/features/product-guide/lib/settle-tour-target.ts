import { animateTourScroll } from './animate-tour-scroll';
import { afterFrames, hasFixedAncestor, measuredOccluders, measuredTarget, viewportMetrics } from './tour-dom';
import {
  cardPlacement,
  isFullyVisible,
  scrollDestination,
  verticalBounds,
  type TourCardPlacement,
  type TourRect,
} from './tour-geometry';

export interface SettledTourTarget {
  rect: TourRect;
  placement: TourCardPlacement;
}

function targetScrollDestination(target: TourRect): number {
  return scrollDestination(
    window.scrollY,
    document.documentElement.scrollHeight,
    window.innerHeight,
    target,
    verticalBounds(viewportMetrics(), measuredOccluders())
  );
}

export async function settleTourTarget(
  target: HTMLElement,
  signal: AbortSignal,
  reducedMotion: boolean
): Promise<SettledTourTarget | null> {
  const fixed = hasFixedAncestor(target);
  let rect = measuredTarget(target);
  let bounds = verticalBounds(viewportMetrics(), measuredOccluders());

  if (!fixed && !isFullyVisible(rect, bounds)) {
    const completed = await animateTourScroll(targetScrollDestination(rect), { signal, reducedMotion });
    if (!completed) return null;
  }
  if (!(await afterFrames(2, signal))) return null;

  rect = measuredTarget(target);
  bounds = verticalBounds(viewportMetrics(), measuredOccluders());
  if (!fixed && !isFullyVisible(rect, bounds)) {
    const corrected = await animateTourScroll(targetScrollDestination(rect), {
      signal,
      reducedMotion,
      duration: 180,
    });
    if (!corrected || !(await afterFrames(2, signal))) return null;
    rect = measuredTarget(target);
  }

  return { rect, placement: cardPlacement(rect, viewportMetrics()) };
}
