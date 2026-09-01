import { useCallback, useEffect, useRef } from 'react';

export function useTourCancellation() {
  const activeController = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    activeController.current?.abort();
    activeController.current = null;
  }, []);

  const begin = useCallback(() => {
    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;
    return controller;
  }, []);

  const release = useCallback((controller: AbortController) => {
    controller.abort();
    if (activeController.current === controller) activeController.current = null;
  }, []);

  useEffect(() => cancel, [cancel]);
  return { begin, release, cancel };
}
