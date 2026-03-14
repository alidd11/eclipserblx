import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { PercentChange } from '@/components/shared/dashboard';
import { DollarSign, TrendingUp, ShoppingCart, Wallet, BarChart3 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';

export function RevenueSummaryStats() {
  const { store } = useSellerStatus();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['seller-revenue-summary', store?.id],
    queryFn: async () => {
      if (!store?.id) return null;

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

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
          .select('total_earned, available_balance')
          .eq('store_id', store.id)
          .maybeSingle(),
      ]);

      const sales = salesRes.data || [];
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      let todayRevenue = 0;
      let thisMonthRevenue = 0;
      let thisMonthOrders = 0;
      let lastMonthRevenue = 0;
      let lastMonthOrders = 0;

      for (const t of sales) {
        const d = new Date(t.created_at);
        const amt = t.net_amount || 0;
        if (d >= startOfThisMonth) {
          thisMonthRevenue += amt;
          thisMonthOrders++;
          if (t.created_at >= startOfToday) todayRevenue += amt;
        } else {
          lastMonthRevenue += amt;
          lastMonthOrders++;
        }
      }

      const totalRevenue = balanceRes.data?.total_earned || 0;
      const availableBalance = balanceRes.data?.available_balance || 0;
      const avgOrderValue = thisMonthOrders > 0 ? thisMonthRevenue / thisMonthOrders : 0;

      return { todayRevenue, thisMonthRevenue, lastMonthRevenue, thisMonthOrders, lastMonthOrders, totalRevenue, availableBalance, avgOrderValue };
    },
    enabled: !!store?.id,
    staleTime: 2 * 60 * 1000, // 2 min cache
  });

  const fmt = (v: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(v);

  const items = [
    { label: "Today's Revenue", value: fmt(stats?.todayRevenue || 0), icon: DollarSign, accent: 'text-primary bg-primary/10' },
    { label: 'This Month', value: fmt(stats?.thisMonthRevenue || 0), icon: TrendingUp, showChange: true, accent: 'text-blue-500 bg-blue-500/10' },
    { label: 'Orders', value: stats?.thisMonthOrders || 0, icon: ShoppingCart, showOrderChange: true, accent: 'text-orange-500 bg-orange-500/10' },
    { label: 'Avg. Order', value: fmt(stats?.avgOrderValue || 0), icon: BarChart3, accent: 'text-purple-500 bg-purple-500/10' },
    { label: 'Balance', value: fmt(stats?.availableBalance || 0), icon: Wallet, highlight: true, accent: 'text-green-500 bg-green-500/10' },
  ];

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-5 md:overflow-visible">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-4 min-w-[150px] flex-shrink-0 md:min-w-0 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-24" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-5 md:overflow-visible md:snap-none">
      {items.map((item) => (
        <Card key={item.label} className="p-4 min-w-[150px] flex-shrink-0 snap-start md:min-w-0 group hover:border-primary/20 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <div className={cn('p-1.5 rounded-lg', item.accent)}>
              <item.icon className="h-3.5 w-3.5" />
            </div>
            <p className="text-xs text-muted-foreground font-medium">{item.label}</p>
          </div>
          <p className={cn('text-xl font-bold tracking-tight', item.highlight && 'text-green-500')}>
            {item.value}
          </p>
          {item.showChange && stats && (
            <PercentChange
              current={stats.thisMonthRevenue}
              previous={stats.lastMonthRevenue}
              label="vs last month"
              className="mt-1"
            />
          )}
          {item.showOrderChange && stats && stats.lastMonthOrders > 0 && (
            <PercentChange
              current={stats.thisMonthOrders}
              previous={stats.lastMonthOrders}
              label="vs last month"
              className="mt-1"
            />
          )}
        </Card>
      ))}
    </div>
  );
}
