import { useState, useEffect, useCallback } from 'react';

export function useThemeAndPrivacy() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('bills_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [hideBalances, setHideBalancesState] = useState(() => {
    return localStorage.getItem('bills_privacy_mode') === 'true';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('bills_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('bills_theme', 'light');
    }
  }, [darkMode]);

  const setHideBalances = useCallback((val: boolean) => {
    setHideBalancesState(val);
    localStorage.setItem('bills_privacy_mode', String(val));
  }, []);

  return {
    darkMode,
    setDarkMode,
    hideBalances,
    setHideBalances,
  };
}
