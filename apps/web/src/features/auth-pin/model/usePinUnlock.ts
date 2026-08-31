import { useState } from 'react';
import { sessionService } from '@/entities/session';

export function usePinUnlock(onUnlock: (token: string, remember: boolean) => void) {
  const [pin, setPin] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (candidate: string) => {
    if (candidate.length < 4) return;
    setLoading(true); setError('');
    try { onUnlock(await sessionService.verifyPin(candidate), remember); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'PIN incorrecto'); setPin(''); }
    finally { setLoading(false); }
  };
  const changePin = (value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 6);
    setPin(clean);
    if (clean.length === 4) void submit(clean);
  };
  return { pin, remember, setRemember, error, loading, submit, changePin };
}
