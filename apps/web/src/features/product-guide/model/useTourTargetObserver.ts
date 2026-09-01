import { useEffect } from 'react';
import { cardPlacement, type TourCardPlacement, type TourRect } from '../lib/tour-geometry';
import { measuredTarget, viewportMetrics, visibleTourTarget } from '../lib/tour-dom';

interface TourTargetObserverOptions {
  enabled: boolean;
  targetId: string;
  onMeasure: (rect: TourRect, placement: TourCardPlacement) => void;
}

export function useTourTargetObserver({ enabled, targetId, onMeasure }: TourTargetObserverOptions) {
  useEffect(() => {
    if (!enabled) return;
    const target = visibleTourTarget(targetId);
    if (!target) return;
    let active = true;
    const update = () => {
      if (!active) return;
      const rect = measuredTarget(target);
      onMeasure(rect, cardPlacement(rect, viewportMetrics()));
    };
    const observer = new ResizeObserver(update);
    observer.observe(target);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    return () => {
      active = false;
      observer.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, [enabled, onMeasure, targetId]);
}
