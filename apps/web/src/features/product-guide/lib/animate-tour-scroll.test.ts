import { afterEach, describe, expect, it, vi } from 'vitest';
import { animateTourScroll, tourEasing, tourScrollDuration } from './animate-tour-scroll';

afterEach(() => vi.unstubAllGlobals());

describe('tour scroll animation', () => {
  it('uses a bounded duration based on distance', () => {
    expect(tourScrollDuration(10)).toBe(320);
    expect(tourScrollDuration(10_000)).toBe(480);
  });

  it('keeps the easing curve within its endpoints', () => {
    expect(tourEasing(-1)).toBe(0);
    expect(tourEasing(0)).toBe(0);
    expect(tourEasing(0.5)).toBeGreaterThan(0.5);
    expect(tourEasing(1)).toBe(1);
  });

  it('scrolls immediately when reduced motion is enabled', async () => {
    let scrollY = 120;
    const scrollTo = vi.fn(({ top }: ScrollToOptions) => { scrollY = Number(top); });
    vi.stubGlobal('window', { get scrollY() { return scrollY; }, scrollTo });
    const completed = await animateTourScroll(640, {
      signal: new AbortController().signal,
      reducedMotion: true,
    });
    expect(completed).toBe(true);
    expect(scrollTo).toHaveBeenCalledWith({ top: 640, behavior: 'auto' });
    expect(scrollY).toBe(640);
  });

  it('does not begin an animation after cancellation', async () => {
    const scrollTo = vi.fn();
    vi.stubGlobal('window', { scrollY: 0, scrollTo });
    const controller = new AbortController();
    controller.abort();
    await expect(animateTourScroll(400, {
      signal: controller.signal,
      reducedMotion: false,
    })).resolves.toBe(false);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('cancels an active frame without applying later updates', async () => {
    let scheduled: FrameRequestCallback | undefined;
    const cancelAnimationFrame = vi.fn();
    const scrollTo = vi.fn();
    vi.stubGlobal('performance', { now: () => 0 });
    vi.stubGlobal('window', {
      scrollY: 0,
      scrollTo,
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        scheduled = callback;
        return 17;
      },
      cancelAnimationFrame,
    });

    const controller = new AbortController();
    const animation = animateTourScroll(400, {
      signal: controller.signal,
      reducedMotion: false,
    });
    controller.abort();

    await expect(animation).resolves.toBe(false);
    expect(cancelAnimationFrame).toHaveBeenCalledWith(17);
    scheduled?.(480);
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
