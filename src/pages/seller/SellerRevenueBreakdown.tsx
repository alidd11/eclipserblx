import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { SellerLayout } from '@/components/seller/SellerLayout';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RevolutAreaChart, RevolutBarChart } from '@/components/ui/revolut-chart';
import { RevolutDonutChart } from '@/components/ui/revolut-donut-chart';
import { useIsInsideHub } from '@/components/admin/AdminHubContext';
import { format, subDays } from '@/lib/dateUtils';
import { formatGBP } from '@/lib/formatters';
import { CHART_COLORS } from '@/lib/chartColors';

export default function SellerRevenueBreakdown() {
  const isInsideHub = useIsInsideHub();
  const { store } = useSellerStatus();
  const [period, setPeriod] = useState<'7' | '30' | '90'>('30');

  const startDate = useMemo(() => subDays(new Date(), Number(period)), [period]);

  const { data: transactions = [] } = useQuery({
    queryKey: ['seller-revenue-breakdown', store?.id, period],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from('seller_transactions')
        .select('*, order_items(product_id, products(name, category_id, categories(name)))')
        .eq('store_id', store.id)
        .eq('type', 'sale')
        .is('refunded_at', null)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!store?.id,
  });

  const dailyRevenue = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = Number(period) - 1; i >= 0; i--) {
      const d = format(subDays(new Date(), i), 'MMM dd');
      map.set(d, 0);
    }
    transactions.forEach((t) => {
      const d = format(new Date(t.created_at!), 'MMM dd');
      map.set(d, (map.get(d) || 0) + Number(t.net_amount || 0));
    });
    return Array.from(map, ([date, revenue]) => ({ date, revenue: Number(revenue.toFixed(2)) }));
  }, [transactions, period]);

  const byProduct = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach((t) => {
      const orderItem = Array.isArray(t.order_items) ? t.order_items[0] : t.order_items;
      const product = orderItem ? (Array.isArray(orderItem.products) ? orderItem.products[0] : orderItem.products) : null;
      const name = product?.name || 'Unknown';
      map.set(name, (map.get(name) || 0) + Number(t.net_amount || 0));
    });
    return Array.from(map, ([name, revenue]) => ({ name, revenue: Number(revenue.toFixed(2)) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [transactions]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach((t) => {
      const orderItem = Array.isArray(t.order_items) ? t.order_items[0] : t.order_items;
      const product = orderItem ? (Array.isArray(orderItem.products) ? orderItem.products[0] : orderItem.products) : null;
      const category = product ? (Array.isArray(product.categories) ? product.categories[0] : product.categories) : null;
      const cat = category?.name || 'Uncategorised';
      map.set(cat, (map.get(cat) || 0) + Number(t.net_amount || 0));
    });
    return Array.from(map, ([name, value]) => ({ name, value: Number(value.toFixed(2)) }));
  }, [transactions]);

  const totalRevenue = transactions.reduce((sum: number, t) => sum + Number(t.net_amount || 0), 0);
  const avgOrderValue = transactions.length > 0 ? totalRevenue / transactions.length : 0;

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  return (
    <SellerLayout><div className="space-y-6">
      {!isInsideHub && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Revenue Breakdown</h1>
            <p className="text-sm text-muted-foreground">Detailed view of your earnings by product, category, and time.</p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        {/* Inline Stats */}
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <span className="text-muted-foreground">
            Net: <span className="font-semibold text-foreground">{formatGBP(totalRevenue)}</span>
          </span>
          <span className="text-muted-foreground">
            Avg order: <span className="font-semibold text-foreground">{formatGBP(avgOrderValue)}</span>
          </span>
          <span className="text-muted-foreground">
            <span className="font-semibold text-foreground">{transactions.length}</span> sales
          </span>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
          <SelectTrigger className="w-auto min-w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Revenue over time */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30"><h3 className="font-semibold text-sm text-base">Revenue Over Time</h3></div>
        <div className="p-4">
          <RevolutAreaChart
            data={dailyRevenue}
            xKey="date"
            series={[{ dataKey: 'revenue', color: CHART_COLORS.purple, name: 'Revenue' }]}
            height={256}
            yFormatter={(v) => `£${v}`}
            tooltipFormatter={(v) => [`${formatGBP(v)}`, 'Revenue']}
            emptyMessage="No revenue in this period yet"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30"><h3 className="font-semibold text-sm text-base">Top Products by Revenue</h3></div>
          <div className="p-4">
            <RevolutBarChart
              data={byProduct}
              xKey="name"
              series={[{ dataKey: 'revenue', color: 'hsl(200 80% 45%)', name: 'Revenue', radius: [0, 6, 6, 0] }]}
              height={256}
              layout="vertical"
              yFormatter={(v) => `£${v}`}
              tooltipFormatter={(v) => [`${formatGBP(v)}`, 'Revenue']}
              emptyMessage="No product sales yet"
            />
          </div>
        </div>

        <div className="border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30"><h3 className="font-semibold text-sm text-base">Revenue by Category</h3></div>
          <div className="p-4">
            {byCategory.length > 0 ? (
              <RevolutDonutChart
                data={byCategory}
                height={256}
                showLabels
                showLegend
                colors={COLORS}
              />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No category data available</p>
            )}
          </div>
        </div>
      </div>
    </div></SellerLayout>
  );
}
