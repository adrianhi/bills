import React from 'react';
import { Calendar, Edit3 } from 'lucide-react';
import type { Transaction } from '@/entities/transaction';
import type { groupTransactionsByDate } from '@/entities/transaction';
import { isSentTransfer, statusCode } from '@/entities/transaction';
import { formatCurrency, formatDate, getOrganizationMeta } from '@/shared/lib';
import { Button } from '@/shared/ui';
import { TransactionIcon, TransactionStatus, TransactionTypeBadge } from './transaction-presenters';

type TransactionGroup = ReturnType<typeof groupTransactionsByDate>[number];

const GroupHeader = ({ group, hideBalances }: { group: TransactionGroup; hideBalances: boolean }) => (
  <tr className="border-y border-border/60 bg-muted/40">
    <td colSpan={8} className="px-6 py-2">
      <div className="flex items-center justify-between text-xs font-bold">
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-emerald-500" />
          <span>{group.title}</span>
          <span className="font-normal text-muted-foreground">• {group.subtitle} ({group.transactions.length} {group.transactions.length === 1 ? 'movimiento' : 'movimientos'})</span>
        </div>
        {hideBalances ? <span className="text-muted-foreground">••••••</span> : (
          <div className="flex items-center gap-3">
            <span className="font-normal text-muted-foreground">En esta página:</span>
            {group.totalExpenseDOP > 0 && <span>Gasto: -{formatCurrency(group.totalExpenseDOP, 'DOP')}</span>}
          </div>
        )}
      </div>
    </td>
  </tr>
);

const TransactionRow = ({ transaction, hideBalances, onEdit }: { transaction: Transaction; hideBalances: boolean; onEdit: (transaction: Transaction) => void }) => {
  const inactive = statusCode(transaction) !== 'APPROVED';
  const sent = isSentTransfer(transaction);
  const institution = getOrganizationMeta(transaction.source, transaction.merchant);
  return (
    <tr className="group transition-colors hover:bg-muted/30">
      <td className="px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${sent ? 'bg-sky-500/15' : 'bg-muted/60'}`}><TransactionIcon transaction={transaction} /></div>
          <div>
            <div className="max-w-[240px] truncate font-semibold" title={transaction.merchant}>{transaction.merchant}</div>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className={`inline-flex rounded border px-1.5 py-0.2 text-[10px] font-semibold ${institution.badgeClass}`}>{institution.shortName}</span>
              <span className="max-w-[140px] truncate font-mono text-[11px] text-muted-foreground" title={transaction.notes || transaction.rawMerchant}>{transaction.notes || transaction.rawMerchant}</span>
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5"><TransactionTypeBadge transaction={transaction} /></td>
      <td className="px-4 py-3.5"><span className="inline-flex rounded-full border border-border/50 bg-muted/60 px-2.5 py-1 text-xs font-medium">{transaction.category || 'Otros'}</span></td>
      <td className="whitespace-nowrap px-4 py-3.5 text-xs text-muted-foreground">{formatDate(transaction.transactionDate)}</td>
      <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">{transaction.cardLast4 ? `•••• ${transaction.cardLast4}` : 'N/A'}</td>
      <td className="px-4 py-3.5"><TransactionStatus transaction={transaction} /></td>
      <td className="px-4 py-3.5 text-right"><div className={`font-mono text-sm font-bold ${inactive ? 'text-muted-foreground line-through' : ''}`}>{hideBalances ? '••••••' : formatCurrency(transaction.amount, transaction.currency)}</div></td>
      <td className="px-4 py-3.5 text-center"><Button variant="ghost" size="icon" onClick={() => onEdit(transaction)} className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground" title="Editar clasificación"><Edit3 className="h-3.5 w-3.5" /></Button></td>
    </tr>
  );
};

export const TransactionDesktopTable = ({ groups, hideBalances, onEdit }: { groups: TransactionGroup[]; hideBalances: boolean; onEdit: (transaction: Transaction) => void }) => (
  <div className="hidden overflow-x-auto lg:block">
    <table className="w-full text-left text-sm">
      <thead className="border-y bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <tr><th className="px-4 py-3 sm:px-6">Comercio / Beneficiario</th><th className="px-4 py-3">Tipo de Movimiento</th><th className="px-4 py-3">Categoría</th><th className="px-4 py-3">Fecha & Hora</th><th className="px-4 py-3">Cuenta / Tarjeta</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3 text-right">Monto</th><th className="px-4 py-3 text-center">Acciones</th></tr>
      </thead>
      <tbody className="divide-y divide-border/40">
        {groups.map((group) => <React.Fragment key={group.dateKey}><GroupHeader group={group} hideBalances={hideBalances} />{group.transactions.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} hideBalances={hideBalances} onEdit={onEdit} />)}</React.Fragment>)}
      </tbody>
    </table>
  </div>
);
