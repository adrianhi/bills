import React from 'react';
import type { Transaction } from '@/entities/transaction';
import { ReceiptText } from 'lucide-react';
import { Button, Card, CardContent } from '@/shared/ui';
import { formatCurrency, formatDate } from '@/shared/lib';

interface RecentTransactionsCardProps {
  transactions: Transaction[];
  loading: boolean;
  hideBalances: boolean;
  onViewAll: () => void;
  onSelectTransaction: (transaction: Transaction) => void;
  onOpenConnections: () => void;
  onAddManual: () => void;
}

export const RecentTransactionsCard: React.FC<RecentTransactionsCardProps> = ({
  transactions,
  loading,
  hideBalances,
  onViewAll,
  onSelectTransaction,
  onOpenConnections,
  onAddManual,
}) => {
  const recentList = transactions.slice(0, 5);

  return (
    <Card className="overflow-hidden border-border/60 shadow-sm">
      <div className="flex items-center justify-between border-b p-4 sm:p-5">
        <div>
          <h3 className="font-bold">Actividad reciente</h3>
          <p className="text-xs text-muted-foreground">
            Tus últimos movimientos registrados
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={onViewAll}
          className="min-h-11 text-primary"
        >
          Ver todos
        </Button>
      </div>
      <CardContent className="p-0">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="h-14 animate-pulse rounded-xl bg-muted"
              />
            ))}
          </div>
        ) : recentList.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <ReceiptText className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">
              Aún no hay movimientos en este período
            </p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Si conectaste Gmail, revisa el estado de importación y los bancos
              seleccionados. También puedes registrar uno manualmente.
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <Button
                variant="outline"
                onClick={onOpenConnections}
                className="min-h-11"
              >
                Revisar conexión
              </Button>
              <Button onClick={onAddManual} className="min-h-11">
                Registrar manual
              </Button>
            </div>
          </div>
        ) : (
          <div className="divide-y">
            {recentList.map((transaction) => (
                <button
                  key={transaction.id}
                  type="button"
                  onClick={() => onSelectTransaction(transaction)}
                  className="flex min-h-[4.5rem] w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/50 sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {transaction.merchant}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {transaction.category || 'Otros'} ·{' '}
                      {formatDate(transaction.transactionDate)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-bold">
                    {hideBalances
                      ? '••••••'
                      : formatCurrency(transaction.amount, transaction.currency)}
                  </p>
                </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
