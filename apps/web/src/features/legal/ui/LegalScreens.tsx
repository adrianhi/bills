import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, FileText, Loader2, ShieldCheck } from 'lucide-react';
import { Button, Card, CardContent } from '@/shared/ui';
import type { LegalDocument } from '../api/legal.service';
import { useAcceptLegal, useLegalDocuments } from '../model/useLegalDocuments';

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

export function LegalDocumentPage({ path }: { path?: string }) {
  const { slug } = useParams();
  const resolvedPath = path ?? `/legal/${slug ?? 'terms'}`;
  const requestedType = routeTypes[resolvedPath] || 'TERMS';
  const query = useLegalDocuments('public');

  const document = query.data?.find((item) => item.type === requestedType);
  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground sm:py-12">
      <main className="mx-auto max-w-3xl">
        <a href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Volver a bills.
        </a>
        <Card className="border-border/60 shadow-xl">
          <CardContent className="p-6 sm:p-10">
            {query.error ? <p className="text-destructive">{query.error.message}</p> : !document ? (
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
  const [confirmed, setConfirmed] = useState(false);
  const query = useLegalDocuments('user', Boolean(authToken));
  const mutation = useAcceptLegal(onAccepted);
  const required = useMemo(() => (query.data ?? []).filter((item) => item.required), [query.data]);

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white"><ShieldCheck className="h-6 w-6" /></div>
          <h1 className="mt-4 text-2xl font-bold">Tu privacidad, antes que todo</h1>
          <p className="mt-2 text-sm text-muted-foreground">Lee y acepta los documentos vigentes antes de conectar una fuente financiera.</p>
        </div>
        <Card className="border-border/60 shadow-xl"><CardContent className="space-y-5 p-6">
          {query.isLoading ? <div className="flex min-h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div> : (
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
              {(query.error || mutation.error) && <p className="text-xs text-destructive">{query.error?.message || mutation.error?.message}</p>}
              <Button className="w-full gap-2" disabled={!confirmed || mutation.isPending || required.length < 2} onClick={() => mutation.mutate(required)}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Aceptar y continuar
              </Button>
              <button className="w-full text-center text-xs text-muted-foreground hover:underline" onClick={onLogout}>No acepto; cerrar sesión</button>
            </>
          )}
        </CardContent></Card>
      </div>
    </div>
  );
}
