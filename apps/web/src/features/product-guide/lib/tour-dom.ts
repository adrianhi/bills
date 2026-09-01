import { measureRect, type TourRect, type TourViewport } from './tour-geometry';

export function visibleTourTarget(id: string): HTMLElement | undefined {
  return Array.from(document.querySelectorAll<HTMLElement>(`[data-product-tour="${id}"]`)).find((element) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  });
}

export function viewportMetrics(): TourViewport {
  const viewport = window.visualViewport;
  return viewport
    ? { top: viewport.offsetTop, left: viewport.offsetLeft, width: viewport.width, height: viewport.height }
    : { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
}

export function measuredTarget(element: HTMLElement): TourRect {
  return measureRect(element.getBoundingClientRect());
}

export function measuredOccluders(): TourRect[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-product-tour-occluder]'))
    .filter((element) => {
      const style = window.getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden';
    })
    .map((element) => measuredTarget(element));
}

export function hasFixedAncestor(element: HTMLElement): boolean {
  let current: HTMLElement | null = element;
  while (current) {
    if (window.getComputedStyle(current).position === 'fixed') return true;
    current = current.parentElement;
  }
  return false;
}

export function afterFrames(count: number, signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    let remaining = count;
    let frame = 0;
    const onAbort = () => {
      window.cancelAnimationFrame(frame);
      resolve(false);
    };
    const advance = () => {
      if (signal.aborted) return onAbort();
      remaining -= 1;
      if (remaining <= 0) {
        signal.removeEventListener('abort', onAbort);
        resolve(true);
      } else {
        frame = window.requestAnimationFrame(advance);
      }
    };
    signal.addEventListener('abort', onAbort, { once: true });
    frame = window.requestAnimationFrame(advance);
  });
}

export function abortableDelay(milliseconds: number, signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve(true);
    }, milliseconds);
    const onAbort = () => {
      window.clearTimeout(timer);
      resolve(false);
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

export function waitForTourTarget(id: string, signal: AbortSignal, timeout = 2_000): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    let observer: MutationObserver | undefined;
    let timer = 0;
    const finish = (target: HTMLElement | null) => {
      window.clearTimeout(timer);
      observer?.disconnect();
      signal.removeEventListener('abort', onAbort);
      resolve(target);
    };
    const locate = () => {
      const target = visibleTourTarget(id);
      if (target) finish(target);
    };
    const onAbort = () => finish(null);
    const initial = visibleTourTarget(id);
    if (initial) return finish(initial);
    observer = new MutationObserver(locate);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    timer = window.setTimeout(() => finish(null), timeout);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}
