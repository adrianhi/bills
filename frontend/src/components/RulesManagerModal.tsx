import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Plus, Trash2, SlidersHorizontal } from 'lucide-react';
import type { CategoryRule } from '@/types';

interface RulesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COMMON_CATEGORIES = [
  'Supermercado',
  'Restaurantes & Delivery',
  'Servicios Financieros',
  'Transporte',
  'Combustible',
  'Servicios',
  'Suscripciones',
  'Salud & Farmacia',
  'Compras Online',
  'Hogar',
  'Ropa & Moda',
  'Entretenimiento',
  'Tecnología',
  'Otros',
];

export const RulesManagerModal: React.FC<RulesManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [rules, setRules] = useState<CategoryRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [pattern, setPattern] = useState('');
  const [normalizedMerchant, setNormalizedMerchant] = useState('');
  const [category, setCategory] = useState(COMMON_CATEGORIES[0]);
  const [submitting, setSubmitting] = useState(false);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/rules');
      if (res.ok) {
        const json = await res.json();
        setRules(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRules();
    }
  }, [isOpen]);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pattern || !normalizedMerchant) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pattern, normalizedMerchant, category }),
      });
      if (res.ok) {
        setPattern('');
        setNormalizedMerchant('');
        fetchRules();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/rules/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setRules(rules.filter((r) => r.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-primary" />
            <DialogTitle>Reglas de Categorización Automática</DialogTitle>
          </div>
        </DialogHeader>

        {/* Add New Rule Form */}
        <form onSubmit={handleCreateRule} className="rounded-xl border bg-muted/40 p-3.5 space-y-3">
          <span className="text-xs font-bold text-foreground">Crear Nueva Regla</span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Input
              placeholder="Patrón (ej: PEDIDOSYA)"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              className="text-xs h-8"
              required
            />
            <Input
              placeholder="Nombre Limpio (ej: PedidosYa)"
              value={normalizedMerchant}
              onChange={(e) => setNormalizedMerchant(e.target.value)}
              className="text-xs h-8"
              required
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            >
              {COMMON_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={submitting} className="h-8 gap-1 text-xs">
              <Plus className="h-3.5 w-3.5" />
              <span>{submitting ? 'Creando...' : 'Agregar Regla'}</span>
            </Button>
          </div>
        </form>

        {/* Existing Rules List */}
        <div className="space-y-2 mt-2 max-h-60 overflow-y-auto pr-1">
          <span className="text-xs font-semibold text-muted-foreground">Reglas Personalizadas ({rules.length})</span>
          {loading ? (
            <div className="text-xs text-muted-foreground p-4 text-center">Cargando reglas...</div>
          ) : rules.length === 0 ? (
            <div className="text-xs text-muted-foreground p-4 text-center border rounded-lg bg-muted/20">
              No hay reglas personalizadas. Las reglas integradas del sistema (Bravo, Uber, Netflix, etc.) se aplican automáticamente.
            </div>
          ) : (
            rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between p-2.5 rounded-lg border bg-card text-xs"
              >
                <div>
                  <span className="font-mono font-bold">{rule.pattern}</span>
                  <span className="text-muted-foreground mx-1.5">&rarr;</span>
                  <span className="font-semibold">{rule.normalizedMerchant}</span>
                  <span className="ml-2 px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground">
                    {rule.category}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteRule(rule.id)}
                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
