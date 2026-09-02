import type { LucideIcon } from 'lucide-react';
import { BarChart3, Home, ReceiptText, WalletCards } from 'lucide-react';

export type AppSection = 'home' | 'transactions' | 'budget' | 'analytics';

export const APP_SECTIONS: Array<{
  id: AppSection;
  label: string;
  path: string;
  icon: LucideIcon;
}> = [
  { id: 'home', label: 'Inicio', path: '/app/inicio', icon: Home },
  { id: 'transactions', label: 'Movimientos', path: '/app/movimientos', icon: ReceiptText },
  { id: 'budget', label: 'Presupuesto', path: '/app/presupuesto', icon: WalletCards },
  { id: 'analytics', label: 'Analítica', path: '/app/analitica', icon: BarChart3 },
];
