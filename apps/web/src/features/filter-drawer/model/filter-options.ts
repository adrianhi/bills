import { ArrowUpRight, Car, Fuel, HeartPulse, Landmark, ShoppingBag, ShoppingCart, Tv, Utensils, Zap } from 'lucide-react';

export const organizationOptions = [
  { id: '', label: 'Todos los Bancos', icon: Landmark }, { id: 'BHD', label: 'Banco BHD', dot: 'bg-emerald-500' },
  { id: 'POPULAR', label: 'Banco Popular', dot: 'bg-blue-500' }, { id: 'BANRESERVAS', label: 'Banreservas', dot: 'bg-sky-600' },
  { id: 'QIK', label: 'Qik Banco Digital', dot: 'bg-purple-500' }, { id: 'APAP', label: 'APAP', dot: 'bg-orange-500' },
  { id: 'SCOTIABANK', label: 'Scotiabank', dot: 'bg-red-500' }, { id: 'MANUAL', label: 'Manual / Efectivo', dot: 'bg-slate-400' },
];
export const movementTypeOptions = [
  { id: '', label: 'Todos los Tipos' }, { id: 'recibida', label: '📥 Ingresos / Recibidas' },
  { id: 'compra', label: '💳 Compras con Tarjeta' }, { id: 'transferencia', label: '↗️ Transf. Enviadas' },
  { id: 'pago', label: '🧾 Pagos de Servicios' }, { id: 'retiro', label: '🏧 Retiros de Cajero' },
];
export const categoryOptions = [
  { id: '', label: 'Todas las Categorías', icon: ShoppingBag }, { id: 'Supermercado', label: 'Supermercado', icon: ShoppingCart },
  { id: 'Restaurantes & Delivery', label: 'Restaurantes & Delivery', icon: Utensils }, { id: 'Servicios Financieros', label: 'Servicios Financieros', icon: Landmark },
  { id: 'Transferencias', label: 'Transferencias', icon: ArrowUpRight }, { id: 'Transporte', label: 'Transporte', icon: Car },
  { id: 'Combustible', label: 'Combustible', icon: Fuel }, { id: 'Servicios', label: 'Servicios', icon: Zap },
  { id: 'Suscripciones', label: 'Suscripciones', icon: Tv }, { id: 'Salud & Farmacia', label: 'Salud & Farmacia', icon: HeartPulse },
  { id: 'Compras Online', label: 'Compras Online', icon: ShoppingBag }, { id: 'Otros', label: 'Otros', icon: ShoppingBag },
];
export const statusOptions = [
  { id: '', label: 'Todos los Estados' }, { id: 'APPROVED', label: '✅ Aprobadas' }, { id: 'DECLINED', label: '❌ Rechazadas' },
  { id: 'REVERSED', label: '↩️ Reversadas' }, { id: 'PENDING', label: '⏳ Pendientes' },
];
