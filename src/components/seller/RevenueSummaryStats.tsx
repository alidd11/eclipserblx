import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PercentChange } from '@/components/shared/dashboard';
import { DollarSign, TrendingUp, ShoppingCart, Package } from 'lucide-react';

export function RevenueSummaryStats() {
  const { store } = useSellerStatus();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['seller-revenue-summary', store?.id],
    queryFn: async () => {
      if (!store?.id) return null;

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

      // Single query: fetch all sales from last month onwards (covers today, this month, last month)
      const [salesRes, balanceRes] = await Promise.all([
        supabase
          .from('seller_transactions')
          .select('net_amount, created_at')
          .eq('store_id', store.id)
          .eq('type', 'sale')
          .is('refunded_at', null)
          .gte('created_at', startOfLastMonth)
          .order('created_at', { ascending: false })
          .limit(1000),
        supabase
          .from('seller_balances')
          .select('total_earned')
          .eq('store_id', store.id)
          .maybeSingle(),
      ]);

      const sales = salesRes.data || [];
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      let todayRevenue = 0;
      let thisMonthRevenue = 0;
      let thisMonthOrders = 0;
      let lastMonthRevenue = 0;

      for (const t of sales) {
        const d = new Date(t.created_at);
        const amt = t.net_amount || 0;
        if (d >= startOfThisMonth) {
          thisMonthRevenue += amt;
          thisMonthOrders++;
          if (t.created_at >= startOfToday) todayRevenue += amt;
        } else {
          lastMonthRevenue += amt;
        }
      }

      const totalRevenue = balanceRes.data?.total_earned || 0;

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
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-4 md:overflow-visible">
      {items.map((item) => (
        <Card key={item.label} className="p-4 min-w-[160px] flex-shrink-0 md:min-w-0">
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
