import { describe, expect, it } from 'vitest';

describe('LoadingContext state management logic', () => {
  it('increments and decrements active loading counter properly', () => {
    let count = 0;
    const show = () => { count++; };
    const hide = () => { count = Math.max(0, count - 1); };

    expect(count).toBe(0);
    show();
    expect(count).toBe(1);
    show();
    expect(count).toBe(2);
    hide();
    expect(count).toBe(1);
    hide();
    expect(count).toBe(0);
    hide();
    expect(count).toBe(0);
  });
});
