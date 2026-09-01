import { useEffect, useState } from 'react';
import { viewportMetrics } from '../lib/tour-dom';
import type { TourViewport } from '../lib/tour-geometry';

function sameViewport(first: TourViewport, second: TourViewport): boolean {
  return first.top === second.top
    && first.left === second.left
    && first.width === second.width
    && first.height === second.height;
}

export function useTourViewport(): TourViewport {
  const [viewport, setViewport] = useState(viewportMetrics);

  useEffect(() => {
    const update = () => setViewport((current) => {
      const next = viewportMetrics();
      return sameViewport(current, next) ? current : next;
    });
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    return () => {
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, []);

  return viewport;
}
