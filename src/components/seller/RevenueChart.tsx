import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';

export function RevenueChart() {
  const { store } = useSellerStatus();
  const [range, setRange] = useState<'7' | '30'>('7');
  const days = parseInt(range);

  const { data: chartData, isLoading } = useQuery({
    queryKey: ['seller-revenue-chart', store?.id, range],
    queryFn: async () => {
      if (!store?.id) return [];

      const startDate = subDays(new Date(), days).toISOString();
      const { data } = await supabase
        .from('seller_transactions')
        .select('created_at, net_amount')
        .eq('store_id', store.id)
        .eq('type', 'sale')
        .gte('created_at', startDate)
        .order('created_at', { ascending: true });

      // Aggregate by day
      const dayMap = new Map<string, number>();
      for (let i = 0; i < days; i++) {
        const day = format(subDays(new Date(), days - 1 - i), 'MMM dd');
        dayMap.set(day, 0);
      }

      data?.forEach((t) => {
        const day = format(new Date(t.created_at), 'MMM dd');
        dayMap.set(day, (dayMap.get(day) || 0) + (t.net_amount || 0));
      });

      return Array.from(dayMap.entries()).map(([date, revenue]) => ({
        date,
        revenue: Math.round(revenue * 100) / 100,
      }));
    },
    enabled: !!store?.id,
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Revenue</CardTitle>
          <Tabs value={range} onValueChange={(v) => setRange(v as '7' | '30')}>
            <TabsList className="h-7">
              <TabsTrigger value="7" className="text-xs px-2 h-6">7d</TabsTrigger>
              <TabsTrigger value="30" className="text-xs px-2 h-6">30d</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="p-0 pr-4 pb-4">
        {isLoading ? (
          <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm animate-pulse">
            Loading chart...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ top: 8, right: 0, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                interval="preserveStartEnd"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v) => `£${v}`}
                width={45}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [`£${value.toFixed(2)}`, 'Revenue']}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#revenueGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
