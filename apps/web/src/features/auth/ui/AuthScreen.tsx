import { AlertCircle, Loader2, Lock, ShieldCheck } from "lucide-react";
import { Button, Card, CardContent } from "@/shared/ui";
import { isSupabaseConfigured } from "@/shared/lib";
import { useSignInActions } from "../model/useSignInActions";

interface AuthScreenProps {
  checkingSession?: boolean;
  setupError?: string;
}

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" {...props}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export function AuthScreen({
  checkingSession = false,
  setupError,
}: AuthScreenProps) {
  const { loading, error, signInWithGoogle } = useSignInActions();

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-foreground">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 text-white shadow-xl shadow-emerald-500/25">
            <span className="text-2xl font-extrabold tracking-tighter">b.</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            bills<span className="text-emerald-500">.</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Tus movimientos financieros, en un solo lugar.
          </p>
        </div>

        <Card className="border-border/60 bg-card/90 shadow-xl backdrop-blur-md">
          <CardContent className="space-y-5 p-6">
            {!isSupabaseConfigured ? (
              <div className="flex gap-2 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  Configura VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY
                  para habilitar el acceso.
                </span>
              </div>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full gap-3 rounded-2xl border-border/80 bg-background font-semibold text-foreground shadow-sm transition-all hover:bg-muted hover:shadow-md"
                  disabled={Boolean(loading)}
                  onClick={() => void signInWithGoogle()}
                >
                  {loading === "google" ? (
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
                  ) : (
                    <GoogleIcon className="h-5 w-5 shrink-0" />
                  )}
                  <span>Continuar con Google</span>
                </Button>

                <div className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                  <Lock className="h-3.5 w-3.5 text-emerald-500" />
                  <span>
                    Autenticación rápida y segura con tu cuenta de Gmail
                  </span>
                </div>
              </>
            )}

            {(error || setupError) && (
              <div className="flex gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error || setupError}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-3 text-center text-[11px] text-muted-foreground">
          <p className="flex items-center justify-center gap-1 font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            Bancos compatibles en piloto: BHD, Qik, Banreservas y Popular.
          </p>
          <p>
            Al continuar aceptas nuestros{" "}
            <a
              href="/legal/terms"
              target="_blank"
              className="underline hover:text-foreground"
            >
              Términos
            </a>{" "}
            y la{" "}
            <a
              href="/legal/privacy"
              target="_blank"
              className="underline hover:text-foreground"
            >
              Política de Privacidad
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
