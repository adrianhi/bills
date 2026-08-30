import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { ProductGuideState } from '@bills/contracts';
import { ArrowLeft, ArrowRight, Loader2, X } from 'lucide-react';
import { Button } from '@/shared/ui';
import { useProductGuide } from '../model/useProductGuide';

type TourSection = 'home' | 'transactions' | 'analytics' | 'more';

interface ProductTourProps {
  open: boolean;
  activeSection: TourSection;
  onOpenChange: (open: boolean) => void;
  onNavigate: (section: TourSection) => void;
  onStateChange: (state: ProductGuideState) => void;
}

interface TourStep {
  section: TourSection;
  target: string;
  title: string;
  description: string;
}

const steps: TourStep[] = [
  { section: 'home', target: 'connection-health', title: 'Tu conexión, siempre clara', description: 'Aquí sabrás si Gmail está actualizado, importando o necesita atención. Tus movimientos guardados no se pierden.' },
  { section: 'home', target: 'period', title: 'Mira el período que te importa', description: 'Cambia fechas y moneda para que el resumen muestre exactamente lo que quieres analizar.' },
  { section: 'transactions', target: 'transactions', title: 'Encuentra cualquier movimiento', description: 'Busca y filtra por banco, tipo, categoría o estado. Toca un registro para corregir su información.' },
  { section: 'transactions', target: 'new-movement', title: 'Añade lo que falte', description: 'Este botón registra movimientos manuales. El recorrido no abrirá el formulario ni creará datos.' },
  { section: 'analytics', target: 'analytics', title: 'Detecta patrones', description: 'Compara categorías y días para entender cómo cambia tu gasto durante el período elegido.' },
  { section: 'more', target: 'more-tools', title: 'Tú mantienes el control', description: 'Desde Más administras bancos, privacidad, reglas y exportaciones, y puedes repetir este recorrido.' },
];

interface TargetRect { top: number; left: number; right: number; bottom: number; width: number; height: number }

function visibleTarget(id: string) {
  return Array.from(document.querySelectorAll<HTMLElement>(`[data-product-tour="${id}"]`)).find((element) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  });
}

function measured(element: HTMLElement): TargetRect {
  const rect = element.getBoundingClientRect();
  return { top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
}

function popoverPosition(rect: TargetRect | null): CSSProperties {
  if (!rect) return { left: 12, right: 12, top: '50%', transform: 'translateY(-50%)' };
  if (window.innerWidth < 640) return rect.top > window.innerHeight / 2
    ? { left: 12, right: 12, top: 16 }
    : { left: 12, right: 12, bottom: 'calc(1rem + env(safe-area-inset-bottom))' };
  const width = 360;
  const left = Math.min(Math.max(16, rect.left), window.innerWidth - width - 16);
  const top = rect.bottom + 16 + 230 < window.innerHeight ? rect.bottom + 16 : Math.max(16, rect.top - 246);
  return { left, top, width };
}

export function ProductTour({ open, activeSection, onOpenChange, onNavigate, onStateChange }: ProductTourProps) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<TargetRect | null>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const guide = useProductGuide(onStateChange);
  const { save } = guide;
  const step = steps[index];

  const finish = useCallback(async (completed: boolean) => {
    try {
      await save(completed);
      onOpenChange(false);
    } catch {
      // Keep the current step visible so the user can retry.
    }
  }, [onOpenChange, save]);

  useEffect(() => {
    if (!open) return;
    if (activeSection !== step.section) {
      onNavigate(step.section);
      return;
    }
    let cancelled = false;
    let attempts = 0;
    let observer: ResizeObserver | undefined;
    let timer: number | undefined;
    let target: HTMLElement | undefined;
    const update = () => { if (target && !cancelled) setRect(measured(target)); };
    const locate = () => {
      if (cancelled) return;
      target = visibleTarget(step.target);
      if (!target && attempts < 20) {
        attempts += 1;
        timer = window.setTimeout(locate, 100);
        return;
      }
      if (!target) {
        if (index < steps.length - 1) {
          setRect(null);
          setIndex((current) => current + 1);
        }
        else void finish(true);
        return;
      }
      const firstRect = target.getBoundingClientRect();
      if (firstRect.top < 8 || firstRect.bottom > window.innerHeight - 8) {
        target.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      }
      timer = window.setTimeout(update, 180);
      update();
      observer = new ResizeObserver(update);
      observer.observe(target);
      window.addEventListener('resize', update);
      window.addEventListener('scroll', update, true);
    };
    locate();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      observer?.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [activeSection, finish, index, onNavigate, open, step.section, step.target]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => nextButtonRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [activeSection, index, open]);

  if (!open) return null;
  const visibleRect = activeSection === step.section ? rect : null;
  const padding = 6;
  const top = Math.max(0, (visibleRect?.top ?? 0) - padding);
  const left = Math.max(0, (visibleRect?.left ?? 0) - padding);
  const right = Math.min(window.innerWidth, (visibleRect?.right ?? 0) + padding);
  const bottom = Math.min(window.innerHeight, (visibleRect?.bottom ?? 0) + padding);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => { if (!next && !guide.saving) void finish(false); }} modal>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content className="pointer-events-none fixed inset-0 z-[70] outline-none" onOpenAutoFocus={(event) => event.preventDefault()}>
          {visibleRect && <>
            <div className="pointer-events-auto fixed inset-x-0 top-0 bg-black/65" style={{ height: top }} />
            <div className="pointer-events-auto fixed inset-x-0 bottom-0 bg-black/65" style={{ top: bottom }} />
            <div className="pointer-events-auto fixed left-0 bg-black/65" style={{ top, width: left, height: Math.max(0, bottom - top) }} />
            <div className="pointer-events-auto fixed right-0 bg-black/65" style={{ top, left: right, height: Math.max(0, bottom - top) }} />
            <div className="pointer-events-auto fixed rounded-[1.25rem] border-2 border-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.22),0_0_36px_hsl(var(--primary)/0.35)]" style={{ top, left, width: Math.max(0, right - left), height: Math.max(0, bottom - top) }} aria-hidden="true" />
          </>}
          {!visibleRect && <div className="pointer-events-auto fixed inset-0 bg-black/65" />}

          <div className="pointer-events-auto fixed rounded-3xl border border-white/20 bg-card/95 p-5 text-card-foreground shadow-2xl backdrop-blur-xl" style={popoverPosition(visibleRect)}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary" aria-live="polite">Paso {index + 1} de {steps.length}</span>
              <button type="button" onClick={() => void finish(false)} disabled={guide.saving} className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Saltar recorrido"><X className="h-4 w-4" /></button>
            </div>
            <DialogPrimitive.Title className="text-lg font-black tracking-tight">{step.title}</DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</DialogPrimitive.Description>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true"><div className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none" style={{ width: `${((index + 1) / steps.length) * 100}%` }} /></div>
            {guide.error && <p role="alert" className="mt-3 text-xs text-destructive">{guide.error}</p>}
            <div className="mt-5 flex items-center gap-2">
              <Button type="button" variant="ghost" className="min-h-11" disabled={index === 0 || guide.saving} onClick={() => { setRect(null); setIndex((current) => Math.max(0, current - 1)); }}><ArrowLeft className="h-4 w-4" />Atrás</Button>
              <Button ref={nextButtonRef} type="button" className="min-h-11 flex-1 gap-2" disabled={guide.saving} onClick={() => { if (index === steps.length - 1) void finish(true); else { setRect(null); setIndex((current) => current + 1); } }}>
                {guide.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : index === steps.length - 1 ? 'Terminar' : <>Siguiente<ArrowRight className="h-4 w-4" /></>}
              </Button>
            </div>
            <button type="button" className="mt-2 min-h-11 w-full text-xs font-semibold text-muted-foreground hover:text-foreground" disabled={guide.saving} onClick={() => void finish(false)}>Saltar recorrido</button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
