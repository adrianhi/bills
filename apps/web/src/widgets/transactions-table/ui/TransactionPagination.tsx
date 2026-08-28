import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/shared/ui';

export const TransactionPagination = ({ page, total, totalPages, onPageChange }: { page: number; total: number; totalPages: number; onPageChange: (page: number) => void }) => (
  <div className="flex flex-col items-center justify-between gap-3 border-t p-4 text-xs text-muted-foreground sm:flex-row">
    <div>Mostrando página <span className="font-bold text-foreground">{page}</span> de <span className="font-bold text-foreground">{totalPages}</span> ({total} registros)</div>
    <div className="flex items-center gap-1.5">
      <Button variant="outline" size="sm" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1} className="h-8 cursor-pointer gap-1 text-xs"><ChevronLeft className="h-3.5 w-3.5" />Anterior</Button>
      <Button variant="outline" size="sm" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="h-8 cursor-pointer gap-1 text-xs">Siguiente<ChevronRight className="h-3.5 w-3.5" /></Button>
    </div>
  </div>
);
