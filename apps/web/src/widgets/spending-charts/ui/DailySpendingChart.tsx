import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui';
import { formatCurrency } from '@/shared/lib';
import type { StatsSummary } from '@/entities/stat';

interface DailySpendingChartProps {
  stats: StatsSummary | null;
  currency: string;
}

export const DailySpendingChart: React.FC<DailySpendingChartProps> = ({ stats, currency }) => {
  const chartData = React.useMemo(() => {
    if (!stats || !stats.dailyTrend || stats.dailyTrend.length === 0) return [];
    return stats.dailyTrend.map((d) => {
      const parts = d.date.split('-');
      const day = parts[2] || '';
      return {
        date: d.date,
        displayDate: `${day}`,
        total: d.total,
        count: d.count,
      };
    });
  }, [stats]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="rounded-xl border bg-popover/95 p-3 text-xs shadow-xl backdrop-blur">
          <div className="font-semibold text-popover-foreground">
            Fecha: {item.date}
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-4 text-muted-foreground">
            <span>Gasto:</span>
            <span className="font-bold text-foreground">
              {formatCurrency(item.total, currency)}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-4 text-muted-foreground">
            <span>Transacciones:</span>
            <span className="font-medium text-foreground">{item.count}</span>
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
          <CardTitle className="text-base font-semibold">Tendencia de Gastos Diarios</CardTitle>
          <span className="text-xs text-muted-foreground">
            Días con actividad
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {chartData.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            No hay gastos diarios registrados en este período.
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.12)" />
                <XAxis 
                  dataKey="displayDate" 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.6 }}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.6 }}
                  tickFormatter={(val) => `$${val > 999 ? (val / 1000).toFixed(0) + 'k' : val}`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }} />
                <Bar 
                  dataKey="total" 
                  fill="url(#barGradient)" 
                  radius={[5, 5, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
