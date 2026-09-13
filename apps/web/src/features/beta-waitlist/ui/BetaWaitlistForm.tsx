import { CheckCircle2, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { Button, Input } from '@/shared/ui';
import { useBetaWaitlist } from '../model/useBetaWaitlist';

interface BetaWaitlistFormProps {
  source?: string;
  className?: string;
}

export function BetaWaitlistForm({ source = 'LANDING_HERO', className = '' }: BetaWaitlistFormProps) {
  const { email, setEmail, status, message, loading, handleSubmit } = useBetaWaitlist({ source });

  if (status === 'success') {
    return (
      <div className={`p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-emerald-300 text-sm flex items-start gap-3 animate-in fade-in zoom-in-95 duration-300 ${className}`}>
        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-emerald-200">¡Acceso reservado!</p>
          <p className="mt-1 text-emerald-300/90 text-xs leading-relaxed">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5 max-w-md mx-auto sm:mx-0">
        <div className="relative flex-1">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu.correo@ejemplo.com"
            disabled={loading}
            required
            className="h-12 bg-slate-900/90 border-slate-700/80 text-foreground placeholder:text-slate-500 px-4 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm"
          />
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="h-12 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold text-sm shadow-lg shadow-emerald-500/20 transition-all active:scale-95 shrink-0 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Reservando…</span>
            </>
          ) : (
            <>
              <span>Solicitar acceso</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </form>

      {status === 'error' && (
        <p className="mt-2 text-xs text-rose-400 animate-in fade-in duration-200">
          {message}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2 text-xs text-slate-400 justify-center sm:justify-start">
        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
        <span>Beta privada limitada a 100 usuarios. 90 días gratis incluidos.</span>
      </div>
    </div>
  );
}
