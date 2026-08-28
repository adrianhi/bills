import { Calendar } from 'lucide-react';
import type { Transaction } from '@/entities/transaction';
import type { groupTransactionsByDate } from '@/entities/transaction/model/selectors';
import { isReceivedTransfer, isSentTransfer, statusCode } from '@/entities/transaction/model/selectors';
import { formatCurrency, formatDate, getOrganizationMeta } from '@/shared/lib';
import { TransactionIcon, TransactionStatus } from './transaction-presenters';

type TransactionGroup = ReturnType<typeof groupTransactionsByDate>[number];

export const TransactionMobileList = ({ groups, hideBalances, onEdit }: {
  groups: TransactionGroup[];
  hideBalances: boolean;
  onEdit: (transaction: Transaction) => void;
}) => (
  <div className="block lg:hidden">
    {groups.map((group) => (
      <div key={group.dateKey} className="border-b border-border/40 last:border-b-0">
        <div className="sticky top-0 z-10 flex items-center justify-between border-y border-border/50 bg-muted/95 px-4 py-2 shadow-xs backdrop-blur-md dark:bg-muted/90">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-xs font-extrabold text-foreground">{group.title}</span>
            <span className="text-[11px] font-medium text-muted-foreground">• {group.subtitle}</span>
          </div>
          {hideBalances ? <span className="text-xs font-bold text-muted-foreground">••••••</span> : (
            <div className="flex items-center gap-1.5 text-xs font-bold" title="Subtotal de los movimientos cargados en esta página">
              {group.totalExpenseDOP > 0 && <span>-{formatCurrency(group.totalExpenseDOP, 'DOP')}</span>}
              {group.totalIncomeDOP > 0 && <span className="text-emerald-600 dark:text-emerald-400">+{formatCurrency(group.totalIncomeDOP, 'DOP')}</span>}
              {group.totalExpenseDOP === 0 && group.totalIncomeDOP === 0 && group.totalExpenseUSD > 0 && <span>-${group.totalExpenseUSD.toFixed(2)}</span>}
            </div>
          )}
        </div>
        <div className="divide-y divide-border/30">
          {group.transactions.map((transaction) => {
            const inactive = statusCode(transaction) !== 'APPROVED';
            const income = isReceivedTransfer(transaction);
            const sent = isSentTransfer(transaction);
            const institution = getOrganizationMeta(transaction.source, transaction.merchant);
            return (
              <button key={transaction.id} type="button" onClick={() => onEdit(transaction)} className="flex w-full cursor-pointer items-center justify-between gap-3 p-3.5 text-left transition-colors hover:bg-muted/30 active:bg-muted/50 sm:p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl ${income ? 'bg-emerald-500/15' : sent ? 'bg-sky-500/15' : 'bg-muted/70'}`}><TransactionIcon transaction={transaction} /></div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-foreground">{transaction.merchant}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className={`inline-flex rounded border px-1.5 py-0.2 text-[10px] font-bold ${institution.badgeClass}`}>{institution.shortName}</span>
                      <span className="truncate">{transaction.category || 'Otros'}</span><span>•</span><span className="truncate">{formatDate(transaction.transactionDate)}</span>
                    </div>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className={`text-sm font-black ${inactive ? 'text-muted-foreground line-through' : income ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>{hideBalances ? '••••••' : `${income ? '+ ' : ''}${formatCurrency(transaction.amount, transaction.currency)}`}</div>
                  <div className="text-[10px] font-semibold text-muted-foreground">{transaction.currency} {transaction.cardLast4 ? `•••• ${transaction.cardLast4}` : ''}</div>
                  <div className="mt-0.5"><TransactionStatus transaction={transaction} /></div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    ))}
  </div>
);
