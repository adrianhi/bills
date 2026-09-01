export interface TourRect {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface TourViewport {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface VerticalBounds {
  top: number;
  bottom: number;
}

export type TourCardPlacement = 'top' | 'bottom' | 'desktop-above' | 'desktop-below';

export interface TourCardPosition {
  left: number;
  top: number;
  width: number;
}

const EDGE_GAP = 12;
const OCCLUDER_SNAP_DISTANCE = 40;

export function measureRect(rect: Pick<DOMRect, 'top' | 'left' | 'right' | 'bottom' | 'width' | 'height'>): TourRect {
  return {
    top: rect.top,
    left: rect.left,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

export function verticalBounds(
  viewport: TourViewport,
  occluders: readonly TourRect[],
  gap = EDGE_GAP
): VerticalBounds {
  const viewportBottom = viewport.top + viewport.height;
  let top = viewport.top + gap;
  let bottom = viewportBottom - gap;

  for (const occluder of occluders) {
    const touchesTopEdge = occluder.top <= viewport.top + OCCLUDER_SNAP_DISTANCE
      && occluder.bottom > viewport.top;
    const touchesBottomEdge = occluder.bottom >= viewportBottom - OCCLUDER_SNAP_DISTANCE
      && occluder.top < viewportBottom;
    if (touchesTopEdge) {
      top = Math.max(top, occluder.bottom + gap);
    }
    if (touchesBottomEdge) {
      bottom = Math.min(bottom, occluder.top - gap);
    }
  }

  if (bottom - top < 80) {
    return { top: viewport.top + gap, bottom: viewportBottom - gap };
  }
  return { top, bottom };
}

export function isFullyVisible(rect: TourRect, bounds: VerticalBounds, gap = 6): boolean {
  return rect.top >= bounds.top + gap && rect.bottom <= bounds.bottom - gap;
}

export function scrollDestination(
  currentScroll: number,
  scrollHeight: number,
  viewportHeight: number,
  target: TourRect,
  bounds: VerticalBounds
): number {
  const availableHeight = Math.max(1, bounds.bottom - bounds.top);
  const desiredTop = target.height >= availableHeight
    ? bounds.top
    : bounds.top + (availableHeight - target.height) / 2;
  const desired = currentScroll + target.top - desiredTop;
  const maximum = Math.max(0, scrollHeight - viewportHeight);
  return Math.min(maximum, Math.max(0, desired));
}

export function cardPlacement(rect: TourRect | null, viewport: TourViewport): TourCardPlacement {
  if (!rect) return viewport.width < 640 ? 'bottom' : 'desktop-below';
  const targetCenter = rect.top + rect.height / 2;
  const viewportCenter = viewport.top + viewport.height / 2;
  if (viewport.width < 640) return targetCenter >= viewportCenter ? 'top' : 'bottom';
  return rect.bottom + 276 < viewport.top + viewport.height ? 'desktop-below' : 'desktop-above';
}

export function tourCardPosition(
  rect: TourRect | null,
  placement: TourCardPlacement,
  viewport: TourViewport
): TourCardPosition | undefined {
  if (viewport.width < 640 || !rect) return undefined;
  const width = 360;
  const left = Math.min(Math.max(viewport.left + 16, rect.left), viewport.left + viewport.width - width - 16);
  const top = placement === 'desktop-below'
    ? rect.bottom + 16
    : Math.max(viewport.top + 16, rect.top - 276);
  return { left, top, width };
}

export function paddedRect(rect: TourRect, viewport: TourViewport, padding = 6): TourRect {
  const viewportRight = viewport.left + viewport.width;
  const viewportBottom = viewport.top + viewport.height;
  const top = Math.max(viewport.top, rect.top - padding);
  const left = Math.max(viewport.left, rect.left - padding);
  const right = Math.min(viewportRight, rect.right + padding);
  const bottom = Math.min(viewportBottom, rect.bottom + padding);
  return { top, left, right, bottom, width: right - left, height: bottom - top };
}
