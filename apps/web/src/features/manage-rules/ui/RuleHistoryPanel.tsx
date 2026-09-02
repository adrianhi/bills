import { Button, Input } from '@/shared/ui';
import type { useRuleHistory } from '../model/useRuleHistory';

const labels: Record<string, string> = { QUEUED: 'En cola', PROCESSING: 'Procesando', READY: 'Vista previa lista', COMPLETED: 'Completado', FAILED: 'Requiere reintento', STALE: 'Vista previa desactualizada' };
export function RuleHistoryPanel({ model }: { model: ReturnType<typeof useRuleHistory> }) {
  return <section className="space-y-3" aria-label="Aplicación histórica">
    {model.ruleId && <div className="space-y-3 rounded-xl border p-4">
      <h3 className="font-semibold">Preparar vista previa</h3>
      <div className="grid grid-cols-2 gap-2"><label className="text-xs">Desde<Input type="date" aria-label="Desde" value={model.startDate} onChange={(event) => model.setStartDate(event.target.value)} /></label>
        <label className="text-xs">Hasta<Input type="date" aria-label="Hasta" value={model.endDate} onChange={(event) => model.setEndDate(event.target.value)} /></label></div>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={model.includeUnknown} onChange={(event) => model.setIncludeUnknown(event.target.checked)} />Incluir registros anteriores sin origen conocido</label>
      <p className="text-xs text-muted-foreground">Las correcciones manuales registradas están protegidas. Sin fechas se revisa todo el histórico visible.</p>
      <Button disabled={model.pending || model.active} onClick={() => model.run('preview')}>Generar vista previa</Button>
    </div>}
    {model.error && <p role="alert" className="text-sm text-destructive">{model.error}</p>}
    {model.jobs.map((job) => <article key={job.id} className="space-y-2 rounded-xl border bg-muted/20 p-4" aria-label="Resultado de aplicación">
      <p className="text-sm font-semibold" role="status">{job.phase === 'PREVIEW' ? 'Vista previa' : 'Aplicación'} · {labels[job.status]}</p>
      {job.ruleLabel && <p className="break-words text-sm">{job.ruleLabel} → {job.ruleCategory}</p>}
      <p className="text-xs text-muted-foreground">{job.startDate || 'Desde el inicio'} · {job.endDate || 'Hasta la fecha de la vista previa'} · {job.includeUnknown ? 'Incluye registros de origen desconocido' : 'Protege registros de origen desconocido'}</p>
      <p className="text-xs">{job.scanned} revisados · {job.matched} coincidencias · {job.changes} cambios propuestos</p>
      <p className="text-xs text-muted-foreground">Categorías: {job.categoryChanges} · Nombres: {job.merchantChanges} · Manuales protegidos: {job.protectedManual} · Origen desconocido protegido: {job.protectedUnknown} · Otra regla prevalece: {job.otherRule}</p>
      {job.phase === 'APPLY' && <p className="text-sm">{job.applied} aplicados · {job.skipped} omitidos por cambios posteriores</p>}
      {job.sample.length > 0 && <details><summary className="cursor-pointer text-xs">Ver muestra del antes y después</summary>
        <ul className="mt-2 space-y-2 text-xs">{job.sample.map((item) => <li className="break-words rounded border p-2" key={item.transactionId}>
          <p>{item.merchant} → {item.nextMerchant}</p><p>{item.category} → {item.nextCategory}</p></li>)}</ul></details>}
      {job.status === 'READY' && <div className="space-y-2"><p className="text-xs text-amber-700 dark:text-amber-300">Confirmar recalcula categorías, reportes y consumo histórico de presupuestos. No cambia importes ni límites.</p>
        <Button disabled={model.pending || model.active || !job.changes} onClick={() => model.run('confirm', job.id)}>Confirmar {job.changes} {job.changes === 1 ? 'cambio' : 'cambios'}</Button></div>}
      {job.status === 'FAILED' && <Button disabled={model.pending || model.active} variant="outline" onClick={() => model.run('retry', job.id)}>Reintentar pendientes</Button>}
      {['QUEUED', 'PROCESSING'].includes(job.status) && <p className="text-xs text-muted-foreground">Puedes cerrar este diálogo. El proceso continuará en segundo plano.</p>}
    </article>)}
  </section>;
}
