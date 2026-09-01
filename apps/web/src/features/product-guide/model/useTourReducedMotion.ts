import { useEffect, useState } from 'react';

function currentPreference(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useTourReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(currentPreference);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return reducedMotion;
}
