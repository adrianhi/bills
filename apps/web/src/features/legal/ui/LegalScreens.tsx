import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, FileText, Loader2, ShieldCheck } from 'lucide-react';
import { Button, Card, CardContent } from '@/shared/ui';

export interface LegalDocument {
  type: 'TERMS' | 'PRIVACY' | 'GOOGLE_API_DISCLOSURE' | 'DATA_DELETION';
  version: string;
  title: string;
  slug: string;
  effectiveAt: string;
  content: string;
  required: boolean;
  accepted: boolean;
}

const routeTypes: Record<string, LegalDocument['type']> = {
  '/legal/terms': 'TERMS',
  '/legal/privacy': 'PRIVACY',
  '/legal/google-api-disclosure': 'GOOGLE_API_DISCLOSURE',
  '/legal/data-deletion': 'DATA_DELETION',
};

function Content({ value }: { value: string }) {
  return (
    <div className="space-y-3 text-sm leading-7 text-muted-foreground">
      {value.split('\n').map((line, index) => {
        const text = line.trim();
        if (!text) return null;
        if (text.startsWith('## ')) {
          return <h2 key={index} className="pt-4 text-lg font-bold text-foreground">{text.slice(3)}</h2>;
        }
        if (text.startsWith('# ')) return null;
        if (text.startsWith('- ')) {
          return <p key={index} className="pl-4 before:mr-2 before:content-['•']">{text.slice(2)}</p>;
        }
        return <p key={index}>{text}</p>;
      })}
    </div>
  );
}

export function LegalDocumentPage({ path = window.location.pathname }: { path?: string }) {
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [error, setError] = useState('');
  const requestedType = routeTypes[path] || 'TERMS';

  useEffect(() => {
    fetch('/api/v1/legal/current')
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.error?.message || 'No pudimos cargar este documento.');
        setDocuments(body.data || []);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'No pudimos cargar este documento.'));
  }, []);

  const document = documents.find((item) => item.type === requestedType);
  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground sm:py-12">
      <main className="mx-auto max-w-3xl">
        <a href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Volver a bills.
        </a>
        <Card className="border-border/60 shadow-xl">
          <CardContent className="p-6 sm:p-10">
            {error ? <p className="text-destructive">{error}</p> : !document ? (
              <div className="flex min-h-52 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>
            ) : (
              <>
                <div className="mb-6 flex items-start gap-3 border-b pb-6">
                  <FileText className="mt-1 h-6 w-6 text-emerald-500" />
                  <div>
                    <h1 className="text-2xl font-bold">{document.title}</h1>
                    <p className="mt-1 text-xs text-muted-foreground">Versión {document.version} · vigente desde {document.effectiveAt.slice(0, 10).split('-').reverse().join('/')}</p>
                  </div>
                </div>
                <Content value={document.content} />
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

interface LegalAcceptanceScreenProps {
  authToken: string;
  onAccepted: () => void;
  onLogout: () => void;
}

export function LegalAcceptanceScreen({ authToken, onAccepted, onLogout }: LegalAcceptanceScreenProps) {
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const required = useMemo(() => documents.filter((item) => item.required), [documents]);

  useEffect(() => {
    fetch('/api/v1/legal/me/current', { headers: { Authorization: `Bearer ${authToken}` } })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.error?.message || 'No pudimos cargar los documentos legales.');
        setDocuments(body.data || []);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'No pudimos cargar los documentos legales.'))
      .finally(() => setLoading(false));
  }, [authToken]);

  const accept = async () => {
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/v1/legal/accept', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documents: required.map(({ type, version }) => ({ type, version })),
          source: required.some((item) => item.accepted) ? 'RECONSENT' : 'SIGNUP',
          locale: 'es-DO',
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message || 'No pudimos guardar tu aceptación.');
      onAccepted();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos guardar tu aceptación.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white"><ShieldCheck className="h-6 w-6" /></div>
          <h1 className="mt-4 text-2xl font-bold">Tu privacidad, antes que todo</h1>
          <p className="mt-2 text-sm text-muted-foreground">Lee y acepta los documentos vigentes antes de conectar una fuente financiera.</p>
        </div>
        <Card className="border-border/60 shadow-xl"><CardContent className="space-y-5 p-6">
          {loading ? <div className="flex min-h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div> : (
            <>
              <div className="space-y-3">
                {required.map((document) => (
                  <a key={document.type} href={`/legal/${document.slug}`} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border p-4 text-sm hover:border-emerald-500/50">
                    <span className="font-semibold">{document.title}</span>
                    <span className="text-xs text-muted-foreground">Leer · v{document.version}</span>
                  </a>
                ))}
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-muted/60 p-4 text-sm">
                <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 h-4 w-4 accent-emerald-600" />
                <span>He leído y acepto los Términos y Condiciones y la Política de Privacidad vigentes.</span>
              </label>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button className="w-full gap-2" disabled={!confirmed || saving || required.length < 2} onClick={accept}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Aceptar y continuar
              </Button>
              <button className="w-full text-center text-xs text-muted-foreground hover:underline" onClick={onLogout}>No acepto; cerrar sesión</button>
            </>
          )}
        </CardContent></Card>
      </div>
    </div>
  );
}
