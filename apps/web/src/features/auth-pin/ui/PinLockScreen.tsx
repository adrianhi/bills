import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';
import { Button, Card, CardContent } from '@/shared/ui';

interface PinLockScreenProps {
  onUnlock: (token: string, remember: boolean) => void;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({ onUnlock }) => {
  const [pin, setPin] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (pinToSubmit: string) => {
    if (pinToSubmit.length < 4) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/v1/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinToSubmit }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onUnlock(data.token, remember);
      } else {
        setError(data.message || 'PIN incorrecto');
        setPin('');
      }
    } catch {
      setError('Error al verificar el PIN');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPin(val);
    if (val.length === 4) {
      handleSubmit(val);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit(pin);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        
        {/* Header Icon & Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 text-white shadow-xl shadow-emerald-500/25">
            <span className="font-extrabold text-2xl tracking-tighter">b.</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 pt-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              bills<span className="text-emerald-500">.</span>
            </h1>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Multi-Bank
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Ingresa tu PIN de seguridad para acceder a tus finanzas
          </p>
        </div>

        {/* Card */}
        <Card className="border-border/60 shadow-xl bg-card/90 backdrop-blur-md">
          <CardContent className="p-6 space-y-5">
            
            {/* Hidden native input for mobile virtual keyboard */}
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pin}
              onChange={handlePinChange}
              onKeyDown={handleKeyDown}
              className="opacity-0 absolute -z-10 w-0 h-0"
              autoFocus
            />

            {/* PIN Dots (Interactive Click to Focus) */}
            <div 
              onClick={() => inputRef.current?.focus()}
              className="flex justify-center items-center gap-3 cursor-pointer py-4"
            >
              {[0, 1, 2, 3].map((index) => {
                const filled = pin.length > index;
                return (
                  <div
                    key={index}
                    className={`h-4 w-4 rounded-full border-2 transition-all duration-200 ${
                      filled
                        ? 'bg-primary border-primary scale-110 shadow-md shadow-primary/30'
                        : 'border-muted-foreground/30 bg-transparent'
                    }`}
                  />
                );
              })}
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-destructive font-medium bg-destructive/10 p-2.5 rounded-lg">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Remember device checkbox */}
            <div className="flex items-center space-x-2 pt-1">
              <input
                id="remember"
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer accent-emerald-600"
              />
              <label
                htmlFor="remember"
                className="text-xs font-medium text-muted-foreground cursor-pointer select-none"
              >
                Recordar este dispositivo (30 días)
              </label>
            </div>

            {/* Submit Button */}
            <Button
              onClick={() => handleSubmit(pin)}
              disabled={loading || pin.length < 4}
              className="w-full h-10 gap-2 font-semibold shadow-md"
            >
              {loading ? (
                <span>Verificando...</span>
              ) : (
                <>
                  <span>Desbloquear Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>

            {/* Security note */}
            <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground/80 pt-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>Acceso seguro cifrado de extremo a extremo</span>
            </div>

          </CardContent>
        </Card>

      </div>
    </div>
  );
};
