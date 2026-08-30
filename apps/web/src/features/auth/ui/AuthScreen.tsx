import { useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { Button, Card, CardContent, Input } from '@/shared/ui';
import { isSupabaseConfigured } from '@/shared/lib';
import { useSignInActions } from '../model/useSignInActions';

interface AuthScreenProps {
  checkingSession?: boolean;
  setupError?: string;
}

export function AuthScreen({ checkingSession = false, setupError }: AuthScreenProps) {
  const [email, setEmail] = useState('');
  const { loading, error, message, signInWithGoogle, sendMagicLink: requestMagicLink } = useSignInActions();

  const submitMagicLink = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    await requestMagicLink(email);
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 text-white shadow-xl shadow-emerald-500/25">
            <span className="font-extrabold text-2xl tracking-tighter">b.</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            bills<span className="text-emerald-500">.</span>
          </h1>
          <p className="text-sm text-muted-foreground">Tus movimientos financieros, en un solo lugar.</p>
        </div>

        <Card className="border-border/60 shadow-xl bg-card/90 backdrop-blur-md">
          <CardContent className="p-6 space-y-4">
            {!isSupabaseConfigured ? (
              <div className="flex gap-2 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Configura VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY para habilitar el acceso.</span>
              </div>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 gap-2 font-semibold"
                  disabled={Boolean(loading)}
                  onClick={() => void signInWithGoogle()}
                >
                  {loading === 'google' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4 text-emerald-500" />}
                  Continuar con Google
                </Button>

                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  o usa un enlace por correo
                  <span className="h-px flex-1 bg-border" />
                </div>

                <form onSubmit={submitMagicLink} className="space-y-3">
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="tu@email.com"
                      className="h-10 pl-9"
                      required
                    />
                  </div>
                  <Button className="w-full h-10 gap-2" disabled={Boolean(loading) || !email.trim()}>
                    {loading === 'email' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    Enviarme un enlace
                  </Button>
                </form>
              </>
            )}

            {(error || setupError) && (
              <div className="flex gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error || setupError}</span>
              </div>
            )}
            {message && (
              <div className="flex gap-2 rounded-lg bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{message}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-[11px] text-muted-foreground">
          Tú eliges cuáles bancos conectar. BHD, Qik y Banreservas están disponibles en piloto.
        </p>
        <p className="text-center text-[11px] text-muted-foreground">
          Al continuar podrás revisar y aceptar nuestros{' '}
          <a href="/legal/terms" target="_blank" className="underline hover:text-foreground">Términos</a>
          {' '}y la{' '}
          <a href="/legal/privacy" target="_blank" className="underline hover:text-foreground">Política de Privacidad</a>.
        </p>
      </div>
    </div>
  );
}
