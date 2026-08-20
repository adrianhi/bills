import React from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip 
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { formatCurrency } from '@/lib/utils';
import type { StatsSummary } from '@/types';

interface CategoryBreakdownChartProps {
  stats: StatsSummary | null;
  currency: string;
}

const CATEGORY_COLORS = [
  '#10b981', // Emerald (Supermercados)
  '#3b82f6', // Blue (Servicios Financieros / Bancos)
  '#f59e0b', // Amber (Restaurantes)
  '#8b5cf6', // Purple (Transporte / Combustible)
  '#ec4899', // Pink (Compras & Hogar)
  '#06b6d4', // Cyan (Servicios / Suscripciones)
  '#64748b', // Slate (Otros)
  '#ef4444', // Red
];

export const CategoryBreakdownChart: React.FC<CategoryBreakdownChartProps> = ({ stats, currency }) => {
  const data = React.useMemo(() => {
    if (!stats || !stats.byCategory || stats.byCategory.length === 0) return [];
    return stats.byCategory.map((cat, idx) => ({
      name: cat.category,
      value: cat.total,
      count: cat.count,
      percentage: cat.percentage,
      color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
    }));
  }, [stats]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="rounded-xl border bg-popover/95 p-3 text-xs shadow-xl backdrop-blur">
          <div className="flex items-center gap-2 font-semibold text-popover-foreground">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span>{item.name}</span>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between gap-4 text-muted-foreground">
            <span>Total:</span>
            <span className="font-bold text-foreground">
              {formatCurrency(item.value, currency)}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-4 text-muted-foreground">
            <span>Transacciones:</span>
            <span className="font-medium text-foreground">{item.count}</span>
          </div>
          <div className="flex items-baseline justify-between gap-4 text-muted-foreground">
            <span>Porcentaje:</span>
            <span className="font-semibold text-primary">{item.percentage}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-border/60 shadow-sm flex flex-col justify-between">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Gastos por Categoría</CardTitle>
          <span className="text-xs text-muted-foreground">
            {data.length} categorías activas
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {data.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            No hay gastos registrados en este período.
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="h-64 w-full sm:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* List / Legend */}
            <div className="w-full sm:w-1/2 space-y-2 max-h-60 overflow-y-auto pr-1">
              {data.map((cat, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2 truncate max-w-[130px]" title={cat.name}>
                    <span
                      className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="font-medium truncate">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{cat.percentage}%</span>
                    <span className="font-semibold">{formatCurrency(cat.value, currency)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
