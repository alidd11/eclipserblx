import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
        const d = new Date(t.created_at!);
        const amt = t.net_amount || 0;
        if (d >= startOfThisMonth) {
          thisMonthRevenue += amt;
          thisMonthOrders++;
          if (t.created_at! >= startOfToday) todayRevenue += amt;
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
    staleTime: 2 * 60 * 1000,
  });

  const { formatPrice: fmt } = useCurrency();

  const items = [
    { label: "Today's Revenue", value: fmt(stats?.todayRevenue || 0), icon: DollarSign, color: 'from-primary/20 to-primary/5', iconColor: 'text-primary' },
    { label: 'This Month', value: fmt(stats?.thisMonthRevenue || 0), icon: TrendingUp, showChange: true, color: 'from-blue-500/20 to-blue-500/5', iconColor: 'text-blue-500' },
    { label: 'Orders', value: stats?.thisMonthOrders || 0, icon: ShoppingCart, showOrderChange: true, color: 'from-orange-500/20 to-orange-500/5', iconColor: 'text-orange-500' },
    { label: 'Avg. Order', value: fmt(stats?.avgOrderValue || 0), icon: BarChart3, color: 'from-purple-500/20 to-purple-500/5', iconColor: 'text-purple-500' },
    { label: 'Balance', value: fmt(stats?.availableBalance || 0), icon: Wallet, highlight: true, color: 'from-green-500/20 to-green-500/5', iconColor: 'text-green-500' },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            'group relative rounded-xl border border-border/50 bg-card p-4 transition-all duration-200',
            'hover:border-border hover:shadow-sm',
            'overflow-hidden'
          )}
        >
          {/* Subtle gradient bg */}
          <div className={cn('absolute inset-0 bg-gradient-to-br opacity-40 rounded-xl', item.color)} />

          <div className="relative">
            <div className={cn('h-8 w-8 rounded-lg bg-background/80 backdrop-blur-sm flex items-center justify-center mb-3 border border-border/30')}>
              <item.icon className={cn('h-4 w-4', item.iconColor)} />
            </div>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1">{item.label}</p>
            <p className={cn('text-lg sm:text-xl font-bold tracking-tight', item.highlight && 'text-green-500')}>
              {item.value}
            </p>
            {item.showChange && stats && (
              <PercentChange
                current={stats.thisMonthRevenue}
                previous={stats.lastMonthRevenue}
                label="vs last month"
                className="mt-1.5"
              />
            )}
            {item.showOrderChange && stats && stats.lastMonthOrders > 0 && (
              <PercentChange
                current={stats.thisMonthOrders}
                previous={stats.lastMonthOrders}
                label="vs last month"
                className="mt-1.5"
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
