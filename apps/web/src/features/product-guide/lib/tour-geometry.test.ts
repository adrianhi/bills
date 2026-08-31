import { describe, expect, it } from 'vitest';
import {
  cardPlacement,
  isFullyVisible,
  paddedRect,
  scrollDestination,
  verticalBounds,
  type TourRect,
  type TourViewport,
} from './tour-geometry';

const viewport: TourViewport = { top: 0, left: 0, width: 393, height: 852 };

function rect(top: number, bottom: number, left = 0, right = 393): TourRect {
  return { top, bottom, left, right, width: right - left, height: bottom - top };
}

describe('tour geometry', () => {
  it('reserves the sticky header and floating mobile navigation', () => {
    expect(verticalBounds(viewport, [rect(0, 64), rect(758, 836)])).toEqual({
      top: 76,
      bottom: 746,
    });
  });

  it('centers a hidden target inside the unobstructed area', () => {
    const bounds = { top: 76, bottom: 746 };
    const target = rect(760, 900, 20, 373);
    const destination = scrollDestination(500, 2_400, 852, target, bounds);
    const shifted = rect(target.top - (destination - 500), target.bottom - (destination - 500));
    expect(destination).toBeGreaterThan(500);
    expect(isFullyVisible(shifted, bounds)).toBe(true);
  });

  it.each([320, 390, 393, 430])('places the mobile card opposite the target at %ipx', (width) => {
    const mobileViewport = { ...viewport, width };
    expect(cardPlacement(rect(650, 720), mobileViewport)).toBe('top');
    expect(cardPlacement(rect(90, 150), mobileViewport)).toBe('bottom');
  });

  it('clamps the spotlight to visual viewport boundaries', () => {
    expect(paddedRect(rect(-4, 860, -8, 410), viewport)).toEqual({
      top: 0,
      left: 0,
      right: 393,
      bottom: 852,
      width: 393,
      height: 852,
    });
  });
});
