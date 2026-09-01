import { useEffect, useRef } from 'react';

export function useTourCardFocus(stepIndex: number) {
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => nextButtonRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [stepIndex]);
  return nextButtonRef;
}
