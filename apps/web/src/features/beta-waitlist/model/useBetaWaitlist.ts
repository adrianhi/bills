import { useState, useTransition } from 'react';
import { betaWaitlistService } from '../api/beta-waitlist.service';

export function useBetaWaitlist(options?: { source?: string; campaignCode?: string }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setStatus('error');
      setMessage('Por favor, introduce un correo electrónico válido.');
      return;
    }

    setStatus('loading');
    setMessage('');

    startTransition(async () => {
      try {
        const result = await betaWaitlistService.register({
          email: cleanEmail,
          source: options?.source || 'LANDING_HERO',
          campaignCode: options?.campaignCode,
        });

        setStatus('success');
        setMessage(result.message || '¡Te has registrado con éxito!');
      } catch (err: unknown) {
        setStatus('error');
        const errMessage = err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Hubo un error al registrarte. Inténtalo más tarde.';
        setMessage(errMessage);
      }
    });
  };

  return {
    email,
    setEmail,
    status,
    message,
    loading: status === 'loading' || isPending,
    handleSubmit,
    reset: () => {
      setEmail('');
      setStatus('idle');
      setMessage('');
    },
  };
}
