import { afterEach, describe, expect, it, vi } from 'vitest';
import { afterFrames, waitForTourTarget } from './tour-dom';

afterEach(() => vi.unstubAllGlobals());

describe('tour DOM resource cleanup', () => {
  it('cancels a pending animation frame when aborted', async () => {
    const cancelAnimationFrame = vi.fn();
    vi.stubGlobal('window', {
      requestAnimationFrame: () => 23,
      cancelAnimationFrame,
    });
    const controller = new AbortController();
    const pendingFrames = afterFrames(2, controller.signal);

    controller.abort();

    await expect(pendingFrames).resolves.toBe(false);
    expect(cancelAnimationFrame).toHaveBeenCalledWith(23);
  });

  it('disconnects target observation and clears its timeout when aborted', async () => {
    const disconnect = vi.fn();
    const observe = vi.fn();
    const clearTimeout = vi.fn();
    vi.stubGlobal('document', {
      body: {},
      querySelectorAll: () => [],
    });
    vi.stubGlobal('window', {
      setTimeout: () => 41,
      clearTimeout,
    });
    vi.stubGlobal('MutationObserver', class {
      observe = observe;
      disconnect = disconnect;
    });
    const controller = new AbortController();
    const target = waitForTourTarget('delayed-target', controller.signal);

    controller.abort();

    await expect(target).resolves.toBeNull();
    expect(observe).toHaveBeenCalledOnce();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(clearTimeout).toHaveBeenCalledWith(41);
  });
});
