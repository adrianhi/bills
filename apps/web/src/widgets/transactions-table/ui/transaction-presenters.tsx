import {
  ArrowDownLeft,
  ArrowUpRight,
  Car,
  CheckCircle2,
  Clock3,
  CreditCard,
  Fuel,
  HeartPulse,
  Landmark,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  Tv,
  Undo2,
  Utensils,
  XCircle,
  Zap,
} from 'lucide-react';
import type { Transaction } from '@/entities/transaction';
import {
  isAtmWithdrawal,
  isReceivedTransfer,
  isSentTransfer,
  isServicePayment,
  statusCode,
} from '@/entities/transaction';

export const TransactionStatus = ({ transaction }: { transaction: Transaction }) => {
  switch (statusCode(transaction)) {
    case 'REVERSED':
      return <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400"><Undo2 className="h-3.5 w-3.5" />Reversada</span>;
    case 'DECLINED':
      return <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive"><XCircle className="h-3.5 w-3.5" />Rechazada</span>;
    case 'PENDING':
      return <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 dark:text-sky-400"><Clock3 className="h-3.5 w-3.5" />Pendiente</span>;
    default:
      return <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" />Aprobada</span>;
  }
};

export const TransactionIcon = ({ transaction }: { transaction: Transaction }) => {
  if (isReceivedTransfer(transaction)) return <ArrowDownLeft className="h-4 w-4 text-emerald-500" />;
  if (isSentTransfer(transaction)) return <ArrowUpRight className="h-4 w-4 text-sky-500" />;
  if (isServicePayment(transaction)) return <Zap className="h-4 w-4 text-amber-500" />;
  if (isAtmWithdrawal(transaction)) return <Landmark className="h-4 w-4 text-blue-500" />;

  const category = (transaction.category || '').toLowerCase();
  if (category.includes('supermercado') || category.includes('bravo') || category.includes('nacional')) return <ShoppingCart className="h-4 w-4 text-emerald-500" />;
  if (category.includes('restaurante') || category.includes('delivery') || category.includes('comida')) return <Utensils className="h-4 w-4 text-amber-500" />;
  if (category.includes('combustible')) return <Fuel className="h-4 w-4 text-orange-500" />;
  if (category.includes('transporte') || category.includes('uber') || category.includes('taxi')) return <Car className="h-4 w-4 text-indigo-500" />;
  if (category.includes('suscripción') || category.includes('streaming') || category.includes('netflix')) return <Tv className="h-4 w-4 text-cyan-500" />;
  if (category.includes('salud') || category.includes('farmacia') || category.includes('médico')) return <HeartPulse className="h-4 w-4 text-rose-500" />;
  return <ShoppingBag className="h-4 w-4 text-slate-400" />;
};

export const TransactionTypeBadge = ({ transaction }: { transaction: Transaction }) => {
  if (isReceivedTransfer(transaction)) return <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400"><ArrowDownLeft className="h-3 w-3" />Recibida</span>;
  if (isSentTransfer(transaction)) return <span className="inline-flex items-center gap-1 rounded-md border border-sky-500/20 bg-sky-500/15 px-2 py-0.5 text-xs font-semibold text-sky-600 dark:text-sky-400"><ArrowUpRight className="h-3 w-3" />Enviada</span>;
  if (isServicePayment(transaction)) return <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/20 bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400"><Receipt className="h-3 w-3" />Servicio</span>;
  if (isAtmWithdrawal(transaction)) return <span className="inline-flex items-center gap-1 rounded-md border border-blue-500/20 bg-blue-500/15 px-2 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400"><Landmark className="h-3 w-3" />Retiro</span>;
  return <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground"><CreditCard className="h-3 w-3" />Compra</span>;
};
