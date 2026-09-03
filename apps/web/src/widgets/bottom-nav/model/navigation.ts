import type { LucideIcon } from 'lucide-react';
import { BarChart3, Home, ReceiptText, WalletCards } from 'lucide-react';

export type AppSection = 'home' | 'transactions' | 'budget' | 'analytics';

export const APP_SECTIONS: Array<{
  id: AppSection;
  label: string;
  path: string;
  icon: LucideIcon;
}> = [
  { id: 'home', label: 'Inicio', path: '/app/home', icon: Home },
  { id: 'transactions', label: 'Movimientos', path: '/app/transactions', icon: ReceiptText },
  { id: 'budget', label: 'Presupuesto', path: '/app/budget', icon: WalletCards },
  { id: 'analytics', label: 'Analítica', path: '/app/analytics', icon: BarChart3 },
];
