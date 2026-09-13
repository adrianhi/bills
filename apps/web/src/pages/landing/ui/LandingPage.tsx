import { Link } from 'react-router-dom';
import { ShieldCheck, Mail, Zap, Sparkles, Building2, BellRing, ArrowRight } from 'lucide-react';
import { BetaWaitlistForm } from '@/features/beta-waitlist';
import { InteractiveMarginCalculator } from './InteractiveMarginCalculator';

interface LandingPageProps {
  hasSession?: boolean;
}

export function LandingPage({ hasSession = false }: LandingPageProps) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-white">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 font-black text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              C.
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold tracking-tight text-white">Cuadre</span>
              <span className="text-xs font-semibold text-emerald-400">Beta</span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/app"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-1.5 text-xs font-semibold text-slate-200 transition-all hover:bg-slate-800 hover:text-white hover:border-slate-600 shadow-sm"
            >
              {hasSession ? 'Ir a mi panel' : 'Ya tengo invitación'}
              <ArrowRight className="h-3.5 w-3.5 text-emerald-400" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))]" />
        
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-medium text-emerald-300 backdrop-blur-sm mb-6 animate-in fade-in duration-500">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            <span>Beta privada para 100 jóvenes asalariados en RD</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.12]">
            ¿Cuánto puedes gastar hoy{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200 bg-clip-text text-transparent">
              sin dañar tu quincena?
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Cuadre no te pide anotar gastos ni revisar gráficos complicados. Conecta tus bancos dominicanos vía Gmail y te dice cada mañana tu margen seguro diario.
          </p>

          <div className="mt-8 flex justify-center">
            <BetaWaitlistForm source="LANDING_HERO" className="max-w-lg" />
          </div>

          {/* Interactive Demo */}
          <div className="mt-14 max-w-3xl mx-auto text-left">
            <InteractiveMarginCalculator />
          </div>
        </div>
      </section>

      {/* Value Pillars */}
      <section className="border-t border-slate-800/80 bg-slate-900/40 py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              La diferencia entre registrar gastos y tomar decisiones
            </h2>
            <p className="mt-3 text-sm text-slate-400">
              Otras aplicaciones te muestran en qué gastaste el mes pasado. Cuadre te dice qué puedes gastar hoy.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 mb-4">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Margen Seguro Diario</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Antes de invitar una cena o comprar algo, mira un solo número: tu saldo libre dividido entre los días que faltan para cobrar.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 mb-4">
                <Mail className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Automatización por Gmail</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Sin digitar vouchers. Cuadre lee los avisos oficiales de tus tarjetas y cuentas para actualizar tu balance al instante.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 mb-4">
                <BellRing className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Pulso Semanal y Cobros Fijos</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Anticipa suscripciones y préstamos antes del corte. Recibe un pulso directo por correo para no quedarte corto a fin de mes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Compatible Banks */}
      <section className="border-t border-slate-800/80 py-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-6">
            <Building2 className="h-4 w-4 text-emerald-400" />
            <span>Compatible con los principales bancos dominicanos</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {['Banco BHD', 'Banreservas', 'Banco Popular', 'Qik Banco Digital', 'APAP', 'Scotiabank'].map((bank) => (
              <span key={bank} className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2 text-xs font-medium text-slate-300 shadow-sm">
                {bank}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Security & Pricing */}
      <section className="border-t border-slate-800/80 bg-slate-900/30 py-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6">
              <div className="flex items-center gap-2.5 text-emerald-400 font-semibold text-sm mb-3">
                <ShieldCheck className="h-5 w-5" />
                <span>Privacidad y Seguridad Garantizada</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-400 leading-relaxed">
                <li>• <strong>Solo lectura bancaria:</strong> Cuadre no puede transferir ni tocar tus fondos.</li>
                <li>• <strong>Cifrado AES-256:</strong> Credenciales protegidas con cifrado simétrico en reposo.</li>
                <li>• <strong>Cero publicidad:</strong> No vendemos datos ni entrenamos IA pública con tus finanzas.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Precio Fundador</span>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">90 DÍAS GRATIS</span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-3xl font-black text-white">RD$ 299</span>
                <span className="text-xs text-slate-400">/ mes</span>
              </div>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Los 100 usuarios de la beta disfrutan 90 días sin costo y precio congelado durante 12 meses. Sin cobros automáticos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-10 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {currentYear} Cuadre. Hecho con orgullo en República Dominicana 🇩🇴</p>
          <div className="flex items-center gap-4">
            <Link to="/terms" className="hover:text-slate-300 transition-colors">Términos de Servicio</Link>
            <span>•</span>
            <Link to="/privacy" className="hover:text-slate-300 transition-colors">Política de Privacidad</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
