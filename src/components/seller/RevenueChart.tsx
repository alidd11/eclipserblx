import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';
import { RevolutAreaChart } from '@/components/ui/revolut-chart';
import { useCurrency } from '@/hooks/useCurrency';
import { CardLoadingSkeleton } from './DashboardPlaceholders';

/** Format a Date to "MMM dd" (e.g. "Mar 14") using native Intl */
function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { month: 'short', day: '2-digit' });
}

export function RevenueChart() {
  const { store } = useSellerStatus();
  const { formatPrice } = useCurrency();
  const [range, setRange] = useState<'7' | '30'>('7');
  const days = parseInt(range);

  const { data: chartData, isLoading } = useQuery({
    queryKey: ['seller-revenue-chart', store?.id, range],
    queryFn: async () => {
      if (!store?.id) return [];

      const startDate = new Date(Date.now() - days * 86400000).toISOString();
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
        const day = formatShortDate(new Date(Date.now() - (days - 1 - i) * 86400000));
        dayMap.set(day, 0);
      }

      data?.forEach((t) => {
        const day = formatShortDate(new Date(t.created_at));
        dayMap.set(day, (dayMap.get(day) || 0) + (t.net_amount || 0));
      });

      return Array.from(dayMap.entries()).map(([date, revenue]) => ({
        date,
        revenue: Math.round(revenue * 100) / 100,
      }));
    },
    enabled: !!store?.id,
    staleTime: 3 * 60 * 1000,
  });

  return (
    <div className="rounded-xl border border-border/50 bg-card">
      <div className="flex items-center justify-between p-4 pb-2">
        <h3 className="text-base font-medium">Revenue</h3>
        <Tabs value={range} onValueChange={(v) => setRange(v as '7' | '30')}>
          <TabsList className="h-7">
            <TabsTrigger value="7" className="text-xs px-2 h-6">7d</TabsTrigger>
            <TabsTrigger value="30" className="text-xs px-2 h-6">30d</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="p-0 pr-4 pb-4">
        {isLoading ? (
          <div className="px-4">
            <CardLoadingSkeleton rows={3} />
          </div>
        ) : (
          <RevolutAreaChart
            data={chartData || []}
            xKey="date"
            series={[{ dataKey: 'revenue', color: 'hsl(var(--primary))', name: 'Revenue' }]}
            height={180}
            yFormatter={(v) => formatPrice(v)}
            tooltipFormatter={(v) => [formatPrice(v), 'Revenue']}
          />
        )}
      </div>
    </div>
  );
}
