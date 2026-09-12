import { useState, useEffect, useCallback } from 'react';

const THEME_STORAGE_KEY = 'cuadre_theme';
const PRIVACY_STORAGE_KEY = 'cuadre_privacy_mode';

export function useThemeAndPrivacy() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) ?? localStorage.getItem('bills_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [hideBalances, setHideBalancesState] = useState(() => {
    const saved = localStorage.getItem(PRIVACY_STORAGE_KEY) ?? localStorage.getItem('bills_privacy_mode');
    return saved === 'true';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem(THEME_STORAGE_KEY, 'light');
    }
  }, [darkMode]);

  const setHideBalances = useCallback((val: boolean) => {
    setHideBalancesState(val);
    localStorage.setItem(PRIVACY_STORAGE_KEY, String(val));
  }, []);

  return {
    darkMode,
    setDarkMode,
    hideBalances,
    setHideBalances,
  };
}
