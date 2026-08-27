import { useState } from 'react';
import { authService } from '../api/auth.service';

export function useSignInActions() {
  const [loading, setLoading] = useState<'google' | 'email' | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const callbackUrl = `${window.location.origin}/auth/callback`;

  const execute = async (kind: 'google' | 'email', action: () => Promise<void>) => {
    setLoading(kind);
    setError('');
    setMessage('');
    try {
      await action();
      if (kind === 'email') setMessage('Revisa tu correo. Te enviamos un enlace seguro para entrar.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos iniciar la sesión.');
    } finally {
      setLoading(null);
    }
  };

  return {
    loading,
    error,
    message,
    signInWithGoogle: () => execute('google', () => authService.signInWithGoogle(callbackUrl)),
    sendMagicLink: (email: string) => execute('email', () => authService.sendMagicLink(email, callbackUrl)),
  };
}
