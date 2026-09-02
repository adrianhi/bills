import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { LoadingScreen } from '../ui/loading-screen';

interface LoadingState {
  active: boolean;
  message: string;
  description?: string;
}

interface LoadingContextValue {
  isLoading: boolean;
  showLoading: (message?: string, description?: string) => void;
  hideLoading: () => void;
  withLoading: <T>(action: () => Promise<T>, message?: string, description?: string) => Promise<T>;
}

const LoadingContext = createContext<LoadingContextValue | null>(null);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    active: false,
    message: 'Cargando tus finanzas…',
    description: 'Sincronizando cuentas y preparando tus datos.',
  });

  const [, setCounter] = useState(0);

  const showLoading = useCallback((message?: string, description?: string) => {
    setCounter((prev) => prev + 1);
    setLoadingState({
      active: true,
      message: message || 'Cargando tus finanzas…',
      description: description ?? 'Sincronizando cuentas y preparando tus datos.',
    });
  }, []);

  const hideLoading = useCallback(() => {
    setCounter((prev) => {
      const next = Math.max(0, prev - 1);
      if (next === 0) {
        setLoadingState((curr) => ({ ...curr, active: false }));
      }
      return next;
    });
  }, []);

  const withLoading = useCallback(
    async <T,>(action: () => Promise<T>, message?: string, description?: string): Promise<T> => {
      showLoading(message, description);
      try {
        return await action();
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading]
  );

  const value = useMemo(
    () => ({
      isLoading: loadingState.active,
      showLoading,
      hideLoading,
      withLoading,
    }),
    [loadingState.active, showLoading, hideLoading, withLoading]
  );

  return (
    <LoadingContext.Provider value={value}>
      {children}
      {loadingState.active && (
        <LoadingScreen
          message={loadingState.message}
          description={loadingState.description}
          fullPage
        />
      )}
    </LoadingContext.Provider>
  );
}

export function useLoading(): LoadingContextValue {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}
