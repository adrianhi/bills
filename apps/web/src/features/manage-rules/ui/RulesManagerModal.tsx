import { Dialog, DialogContent, DialogHeader, DialogTitle, Button } from '@/shared/ui';
import { useRulesManager } from '../model/useRulesManager';
import { useRuleHistory } from '../model/useRuleHistory';
import type { RuleSuggestion } from '../model/rule-editor';
import { RuleEditorForm } from './RuleEditorForm';
import { RuleList } from './RuleList';
import { RuleHistoryPanel } from './RuleHistoryPanel';

interface Props { isOpen: boolean; onClose: () => void; authToken: string | null; suggestion?: RuleSuggestion; }
export function RulesManagerModal({ isOpen, onClose, authToken, suggestion }: Props) {
  const model = useRulesManager(isOpen, Boolean(authToken), suggestion);
  const history = useRuleHistory(Boolean(authToken));
  return <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader><DialogTitle>Reglas de categorización</DialogTitle></DialogHeader>
      <p className="text-sm text-muted-foreground">Organiza futuros gastos y revisa los cambios antes de aplicarlos al pasado.</p>
      {history.active && <p role="status" className="rounded-lg bg-muted p-3 text-sm">Hay una operación en curso. Podrás modificar reglas cuando termine.</p>}
      {model.error && <p role="alert" className="text-sm text-destructive">{model.error}</p>}
      {model.loading ? <p role="status">Cargando reglas…</p> : <>
        <RuleEditorForm model={model} disabled={history.active} onSaved={history.setRuleId} />
        <RuleList rules={model.rules} disabled={history.active || model.pending} onEdit={model.edit}
          onToggle={(rule) => model.act('toggle', rule)} onRemove={(rule) => model.act('delete', rule)} onPreview={history.setRuleId} />
      </>}
      <RuleHistoryPanel model={history} />
      <Button variant="outline" onClick={onClose}>Cerrar</Button>
    </DialogContent>
  </Dialog>;
}
