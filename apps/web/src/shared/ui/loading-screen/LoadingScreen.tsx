import React from 'react';

export interface LoadingScreenProps {
  message?: string;
  description?: string;
  fullPage?: boolean;
  className?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Cargando tus finanzas…',
  description = 'Sincronizando cuentas y preparando tus datos.',
  fullPage = true,
  className = '',
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`${
        fullPage ? 'fixed inset-0 z-[9999]' : 'relative min-h-[60vh] w-full'
      } flex flex-col items-center justify-center bg-background/90 backdrop-blur-md transition-all duration-300 select-none ${className}`}
    >
      {/* Halo glow */}
      <div
        className="pointer-events-none absolute h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl animate-pulse"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center px-6 text-center max-w-xs">
        {/* Logo and Animated Spinner Ring */}
        <div className="relative mb-5 flex items-center justify-center">
          <div
            className="absolute -inset-2.5 rounded-3xl bg-gradient-to-tr from-emerald-500/25 to-teal-400/20 blur-md animate-pulse"
            aria-hidden="true"
          />
          <div
            className="absolute -inset-2 rounded-[18px] border-2 border-emerald-500/20 border-t-emerald-500 animate-spin"
            aria-hidden="true"
          />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-2xl font-black text-white shadow-xl shadow-emerald-500/25">
            b.
          </div>
        </div>

        {/* Text and Description */}
        <h3 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
          {message}
        </h3>
        {description && (
          <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}

        {/* Subtle Activity Bar */}
        <div
          className="mt-5 h-1 w-28 overflow-hidden rounded-full bg-muted/60"
          aria-hidden="true"
        >
          <div className="h-full w-full rounded-full bg-gradient-to-r from-emerald-600 via-teal-400 to-emerald-600 animate-pulse" />
        </div>
      </div>
    </div>
  );
};
