const MIN_DURATION = 320;
const MAX_DURATION = 480;

export function tourScrollDuration(distance: number): number {
  return Math.round(Math.min(MAX_DURATION, Math.max(MIN_DURATION, 280 + Math.abs(distance) * 0.18)));
}

function sampleCurve(t: number, first: number, second: number): number {
  const inverse = 1 - t;
  return 3 * inverse * inverse * t * first + 3 * inverse * t * t * second + t * t * t;
}

export function tourEasing(progress: number): number {
  const x = Math.min(1, Math.max(0, progress));
  let guess = x;
  for (let iteration = 0; iteration < 6; iteration += 1) {
    const current = sampleCurve(guess, 0.22, 0.36) - x;
    const inverse = 1 - guess;
    const derivative = 3 * inverse * inverse * 0.22
      + 6 * inverse * guess * (0.36 - 0.22)
      + 3 * guess * guess * (1 - 0.36);
    if (Math.abs(derivative) < 0.0001) break;
    guess = Math.min(1, Math.max(0, guess - current / derivative));
  }
  return sampleCurve(guess, 1, 1);
}

interface AnimateTourScrollOptions {
  signal: AbortSignal;
  reducedMotion: boolean;
  duration?: number;
}

export function animateTourScroll(destination: number, options: AnimateTourScrollOptions): Promise<boolean> {
  const start = window.scrollY;
  const distance = destination - start;
  if (options.signal.aborted) return Promise.resolve(false);
  if (options.reducedMotion || Math.abs(distance) < 1) {
    window.scrollTo({ top: destination, behavior: 'auto' });
    return Promise.resolve(true);
  }

  const duration = options.duration ?? tourScrollDuration(distance);
  return new Promise((resolve) => {
    const startedAt = performance.now();
    let frame = 0;
    const finish = (completed: boolean) => {
      window.cancelAnimationFrame(frame);
      options.signal.removeEventListener('abort', onAbort);
      resolve(completed);
    };
    const onAbort = () => finish(false);
    const tick = (now: number) => {
      if (options.signal.aborted) return finish(false);
      const progress = Math.min(1, (now - startedAt) / duration);
      window.scrollTo({ top: start + distance * tourEasing(progress), behavior: 'auto' });
      if (progress >= 1) return finish(true);
      frame = window.requestAnimationFrame(tick);
    };
    options.signal.addEventListener('abort', onAbort, { once: true });
    frame = window.requestAnimationFrame(tick);
  });
}
