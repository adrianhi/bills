import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { copySafeDiagnostic } from '@/shared/lib/safe-diagnostic';
import { Button } from './button';

interface SafeDiagnosticButtonProps {
  error: unknown;
  area: string;
  extra?: Record<string, string | number | null | undefined>;
  className?: string;
}

export function SafeDiagnosticButton({ error, area, extra, className }: SafeDiagnosticButtonProps) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const copy = async () => {
    try {
      await copySafeDiagnostic(error, area, extra);
      setFailed(false);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      setFailed(true);
    }
  };
  return (
    <div>
      <Button type="button" size="sm" variant="outline" className={className} onClick={() => void copy()}>
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? 'Diagnóstico copiado' : 'Copiar diagnóstico seguro'}
      </Button>
      {failed && <p className="mt-1 text-[11px] text-destructive">No se pudo copiar. Inténtalo otra vez.</p>}
    </div>
  );
}
