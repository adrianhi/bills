import { useCallback, useEffect, useRef, useState } from 'react';
import { configureHttpAuth } from '@/shared/api';
import { authService } from '../api/auth.service';

export function useAuthSession() {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [setupError, setSetupError] = useState('');
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [legalAcceptanceRequired, setLegalAcceptanceRequired] = useState(false);
  const tokenRef = useRef<string | null>(null);
  const activatingTokenRef = useRef<string | null>(null);

  const clearSession = useCallback(() => {
    tokenRef.current = null;
    setAuthToken(null);
    setOnboardingComplete(false);
    setLegalAcceptanceRequired(false);
    setSetupError('');
  }, []);

  const handleLock = useCallback(async () => {
    clearSession();
    await authService.signOut();
  }, [clearSession]);

  useEffect(() => {
    configureHttpAuth({ getToken: () => tokenRef.current, onUnauthorized: clearSession });
  }, [clearSession]);

  useEffect(() => {
    let active = true;

    const activateSession = async (token?: string) => {
      if (!active) return;
      if (!token) {
        activatingTokenRef.current = null;
        clearSession();
        setCheckingSession(false);
        return;
      }
      if (activatingTokenRef.current === token) return;
      activatingTokenRef.current = token;
      tokenRef.current = token;
      setCheckingSession(true);
      setSetupError('');
      try {
        const bootstrap = await authService.bootstrap(token);
        if (!active) return;
        setAuthToken(token);
        setLegalAcceptanceRequired(bootstrap.legalAcceptanceRequired);
        setOnboardingComplete(bootstrap.onboardingComplete);
      } catch (error) {
        if (active) {
          clearSession();
          setSetupError(error instanceof Error ? error.message : 'No se pudo iniciar la sesión.');
        }
      } finally {
        activatingTokenRef.current = null;
        if (active) setCheckingSession(false);
      }
    };

    authService.getSession()
      .then((session) => activateSession(session?.access_token))
      .catch((error: unknown) => {
        if (active) {
          setSetupError(error instanceof Error ? error.message : 'No se pudo comprobar la sesión.');
          setCheckingSession(false);
        }
      });
    const subscription = authService.onSessionChange((_event, session) => {
      void activateSession(session?.access_token);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [clearSession]);

  return {
    authToken,
    checkingSession,
    setupError,
    onboardingComplete,
    setOnboardingComplete,
    legalAcceptanceRequired,
    setLegalAcceptanceRequired,
    handleLock,
  };
}
