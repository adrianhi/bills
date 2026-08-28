import type { LucideIcon } from 'lucide-react';
import { BarChart3, Home, Menu, ReceiptText } from 'lucide-react';

export type AppSection = 'home' | 'transactions' | 'analytics' | 'more';

export const APP_SECTIONS: Array<{
  id: AppSection;
  label: string;
  path: string;
  icon: LucideIcon;
}> = [
  { id: 'home', label: 'Inicio', path: '/app/inicio', icon: Home },
  { id: 'transactions', label: 'Movimientos', path: '/app/movimientos', icon: ReceiptText },
  { id: 'analytics', label: 'Analítica', path: '/app/analitica', icon: BarChart3 },
  { id: 'more', label: 'Más', path: '/app/mas', icon: Menu },
];
