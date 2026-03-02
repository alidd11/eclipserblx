import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PercentChange } from '@/components/shared/dashboard';
import { DollarSign, TrendingUp, ShoppingCart, Package } from 'lucide-react';
import { subDays } from 'date-fns';

export function RevenueSummaryStats() {
  const { store } = useSellerStatus();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['seller-revenue-summary', store?.id],
    queryFn: async () => {
      if (!store?.id) return null;

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

      // Today's revenue
      const { data: todaySales } = await supabase
        .from('seller_transactions')
        .select('net_amount')
        .eq('store_id', store.id)
        .eq('type', 'sale')
        .gte('created_at', startOfToday);

      const todayRevenue = todaySales?.reduce((sum, t) => sum + (t.net_amount || 0), 0) || 0;

      // This month revenue
      const { data: monthSales } = await supabase
        .from('seller_transactions')
        .select('net_amount')
        .eq('store_id', store.id)
        .eq('type', 'sale')
        .gte('created_at', startOfThisMonth);

      const thisMonthRevenue = monthSales?.reduce((sum, t) => sum + (t.net_amount || 0), 0) || 0;
      const thisMonthOrders = monthSales?.length || 0;

      // Last month revenue (for comparison)
      const { data: lastMonthSales } = await supabase
        .from('seller_transactions')
        .select('net_amount')
        .eq('store_id', store.id)
        .eq('type', 'sale')
        .gte('created_at', startOfLastMonth)
        .lte('created_at', endOfLastMonth);

      const lastMonthRevenue = lastMonthSales?.reduce((sum, t) => sum + (t.net_amount || 0), 0) || 0;

      // Total all-time
      const { data: allTimeSales } = await supabase
        .from('seller_transactions')
        .select('net_amount')
        .eq('store_id', store.id)
        .eq('type', 'sale');

      const totalRevenue = allTimeSales?.reduce((sum, t) => sum + (t.net_amount || 0), 0) || 0;

      return { todayRevenue, thisMonthRevenue, lastMonthRevenue, thisMonthOrders, totalRevenue };
    },
    enabled: !!store?.id,
  });

  const fmt = (v: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(v);

  const items = [
    { label: "Today's Revenue", value: fmt(stats?.todayRevenue || 0), icon: DollarSign },
    { label: 'This Month', value: fmt(stats?.thisMonthRevenue || 0), icon: TrendingUp, showChange: true },
    { label: 'Monthly Orders', value: stats?.thisMonthOrders || 0, icon: ShoppingCart },
    { label: 'All-Time Revenue', value: fmt(stats?.totalRevenue || 0), icon: Package },
  ];

  if (isLoading) {
    return null; // Parent shows skeleton
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((item) => (
        <Card key={item.label} className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <item.icon className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">{item.label}</p>
          </div>
          <p className="text-xl font-bold">{item.value}</p>
          {item.showChange && stats && (
            <PercentChange
              current={stats.thisMonthRevenue}
              previous={stats.lastMonthRevenue}
              label="vs last month"
              className="mt-1"
            />
          )}
        </Card>
      ))}
    </div>
  );
}
