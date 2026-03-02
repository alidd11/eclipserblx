import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';
import { RevolutAreaChart } from '@/components/ui/revolut-chart';
import { format, subDays } from 'date-fns';

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
        .is('refunded_at', null)
        .gte('created_at', startDate)
        .order('created_at', { ascending: true });

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
          <RevolutAreaChart
            data={chartData || []}
            xKey="date"
            series={[{ dataKey: 'revenue', color: 'hsl(var(--primary))', name: 'Revenue' }]}
            height={180}
            yFormatter={(v) => `£${v}`}
            tooltipFormatter={(v) => [`£${v.toFixed(2)}`, 'Revenue']}
          />
        )}
      </CardContent>
    </Card>
  );
}
