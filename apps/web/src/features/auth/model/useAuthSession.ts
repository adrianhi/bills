import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/shared/lib';

export function useAuthSession() {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [setupError, setSetupError] = useState('');
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [legalAcceptanceRequired, setLegalAcceptanceRequired] = useState(false);

  const activatingTokenRef = useRef<string | null>(null);

  const handleLock = useCallback(async () => {
    setAuthToken(null);
    setOnboardingComplete(false);
    setLegalAcceptanceRequired(false);
    setSetupError('');
    await supabase?.auth.signOut();
  }, []);

  useEffect(() => {
    let active = true;

    const activateSession = async (token?: string) => {
      if (!active) return;
      if (!token) {
        activatingTokenRef.current = null;
        setAuthToken(null);
        setCheckingSession(false);
        return;
      }

      if (activatingTokenRef.current === token) return;
      activatingTokenRef.current = token;

      setCheckingSession(true);
      setSetupError('');
      try {
        const response = await fetch('/api/v1/me/bootstrap', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error?.message || 'No se pudo preparar tu espacio personal.');
        }
        const body = await response.json().catch(() => null);
        if (active) {
          setAuthToken(token);
          setLegalAcceptanceRequired(Boolean(body?.data?.legalAcceptanceRequired));
          setOnboardingComplete(Boolean(body?.data?.onboardingComplete));
          setSetupError('');
        }
      } catch (error) {
        if (active) {
          setAuthToken(null);
          setSetupError(error instanceof Error ? error.message : 'No se pudo iniciar la sesión.');
        }
      } finally {
        activatingTokenRef.current = null;
        if (active) setCheckingSession(false);
      }
    };

    if (!supabase) {
      setCheckingSession(false);
      return () => {
        active = false;
      };
    }

    supabase.auth.getSession().then(({ data }) => activateSession(data.session?.access_token));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      void activateSession(session?.access_token);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

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
