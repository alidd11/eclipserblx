import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, PiggyBank, Users, BarChart3, Percent } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, subMonths, startOfDay, subDays, format, isAfter } from 'date-fns';
import { RevolutDonutChart } from '@/components/ui/revolut-donut-chart';
import { RevolutAreaChart } from '@/components/ui/revolut-chart';
import { cn } from '@/lib/utils';

const ROBUX_TO_GBP_RATE = 0.00275;

interface StripeBalanceData {
  balance: { available: number; pending: number; currency: string };
  summary: {
    last30Days: { gross: number; fees: number; net: number; refunds?: number };
  };
}

function MetricCard({
  label,
  value,
  subtitle,
  trend,
  icon: Icon,
  accentClass = 'text-primary',
  isLoading,
}: {
  label: string;
  value: string;
  subtitle?: string;
  trend?: { value: number; label: string };
  icon: typeof TrendingUp;
  accentClass?: string;
  isLoading?: boolean;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
            <Icon className={cn('h-4.5 w-4.5', accentClass)} />
          </div>
          {trend && !isLoading && (
            <div
              className={cn(
                'flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full',
                trend.value >= 0
                  ? 'text-emerald-600 bg-emerald-500/10'
                  : 'text-red-500 bg-red-500/10'
              )}
            >
              {trend.value >= 0 ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {Math.abs(trend.value).toFixed(0)}%
            </div>
          )}
        </div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
        {isLoading ? (
          <Skeleton className="h-8 w-28" />
        ) : (
          <p className={cn('text-2xl font-bold tracking-tight', accentClass)}>{value}</p>
        )}
        {subtitle && !isLoading && (
          <p className="text-[11px] text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function FinancialOverview() {
  // Stripe balance
  const { data: stripeBalance, isLoading: stripeLoading } = useQuery<StripeBalanceData>({
    queryKey: ['admin-stripe-balance'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-stripe-balance');
      if (error) throw error;
      return data as StripeBalanceData;
    },
    staleTime: 60000,
  });

  // Orders for revenue
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-financial-overview-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('total, created_at')
        .in('status', ['paid', 'fulfilled', 'completed']);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60000,
  });

  // Ad revenue
  const { data: adRevenue, isLoading: adsLoading } = useQuery({
    queryKey: ['admin-financial-overview-ads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discord_advertisements')
        .select('price_paid, ping_price_paid, posted_at')
        .not('posted_at', 'is', null);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60000,
  });

  // Subscriptions (Eclipse+)
  const { data: subsData, isLoading: subsLoading } = useQuery({
    queryKey: ['admin-financial-overview-subs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('status, billing_period, created_at');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60000,
  });

  // Commission data
  const { data: commissionData, isLoading: commLoading } = useQuery({
    queryKey: ['admin-financial-overview-commission'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seller_transactions')
        .select('platform_fee, created_at')
        .eq('type', 'sale')
        .is('refunded_at', null);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60000,
  });

  // Credit purchases
  const { data: creditPurchases, isLoading: creditsLoading } = useQuery({
    queryKey: ['admin-financial-overview-credits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('amount, created_at')
        .eq('type', 'purchase');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60000,
  });

  // Robux
  const { data: robuxData, isLoading: robuxLoading } = useQuery({
    queryKey: ['admin-financial-overview-robux'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('robux_transactions')
        .select('robux_after_tax, created_at');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60000,
  });

  const isLoading = stripeLoading || ordersLoading || adsLoading || subsLoading || commLoading || creditsLoading || robuxLoading;

  const metrics = useMemo(() => {
    const now = new Date();
    const thisMonth = startOfMonth(now);
    const lastMonth = startOfMonth(subMonths(now, 1));
    const thirtyDaysAgo = subDays(now, 30);
    const sixtyDaysAgo = subDays(now, 60);

    // Total all-time gross revenue from orders
    const allTimeGross = (ordersData ?? []).reduce((s, o) => s + (o.total ?? 0), 0);

    // This month revenue
    const thisMonthRevenue = (ordersData ?? [])
      .filter(o => isAfter(new Date(o.created_at), thisMonth))
      .reduce((s, o) => s + (o.total ?? 0), 0);
    const lastMonthRevenue = (ordersData ?? [])
      .filter(o => {
        const d = new Date(o.created_at);
        return isAfter(d, lastMonth) && !isAfter(d, thisMonth);
      })
      .reduce((s, o) => s + (o.total ?? 0), 0);
    const monthOverMonth = lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : 0;

    // Commission (platform take)
    const totalCommission = (commissionData ?? []).reduce((s, c) => s + (c.platform_fee ?? 0), 0);
    const thisMonthCommission = (commissionData ?? [])
      .filter(c => isAfter(new Date(c.created_at), thisMonth))
      .reduce((s, c) => s + (c.platform_fee ?? 0), 0);

    // Ad revenue
    const totalAdRevenue = (adRevenue ?? []).reduce(
      (s, a) => s + (a.price_paid ?? 0) + (a.ping_price_paid ?? 0),
      0
    );
    const thisMonthAdRevenue = (adRevenue ?? [])
      .filter(a => isAfter(new Date(a.posted_at!), thisMonth))
      .reduce((s, a) => s + (a.price_paid ?? 0) + (a.ping_price_paid ?? 0), 0);

    // Eclipse+ MRR estimate
    const activeSubs = (subsData ?? []).filter(s => s.status === 'active');
    const mrr = activeSubs.reduce((s, sub) => {
      if (sub.billing_period === 'annual') return s + 49.99 / 12;
      return s + 4.99;
    }, 0);

    // Credits
    const totalCredits = (creditPurchases ?? []).reduce((s, c) => s + (c.amount ?? 0), 0);

    // Robux in GBP
    const totalRobuxGBP = (robuxData ?? []).reduce(
      (s, r) => s + (r.robux_after_tax ?? 0) * ROBUX_TO_GBP_RATE,
      0
    );

    // Stripe actual balance
    const stripeAvailable = stripeBalance?.balance.available ?? 0;
    const stripePending = stripeBalance?.balance.pending ?? 0;

    // Revenue composition for donut
    const composition = [
      { name: 'Product Sales', value: Math.round(allTimeGross) },
      { name: 'Commission', value: Math.round(totalCommission) },
      { name: 'Advertising', value: Math.round(totalAdRevenue) },
      { name: 'Eclipse+', value: Math.round(mrr * 12) },
      { name: 'Credits', value: Math.round(totalCredits) },
      { name: 'Robux (est.)', value: Math.round(totalRobuxGBP) },
    ].filter(c => c.value > 0);

    // 30-day revenue trend (daily)
    const dailyRevenue: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      dailyRevenue[format(subDays(now, i), 'yyyy-MM-dd')] = 0;
    }
    (ordersData ?? []).forEach(o => {
      const d = format(new Date(o.created_at), 'yyyy-MM-dd');
      if (dailyRevenue[d] !== undefined) dailyRevenue[d] += o.total ?? 0;
    });
    const trendData = Object.entries(dailyRevenue).map(([date, revenue]) => ({
      date,
      displayDate: format(new Date(date), 'MMM d'),
      revenue,
    }));

    // 30-day vs prev 30-day total
    const last30 = (ordersData ?? [])
      .filter(o => isAfter(new Date(o.created_at), thirtyDaysAgo))
      .reduce((s, o) => s + (o.total ?? 0), 0);
    const prev30 = (ordersData ?? [])
      .filter(o => {
        const d = new Date(o.created_at);
        return isAfter(d, sixtyDaysAgo) && !isAfter(d, thirtyDaysAgo);
      })
      .reduce((s, o) => s + (o.total ?? 0), 0);
    const revenueTrend = prev30 > 0 ? ((last30 - prev30) / prev30) * 100 : 0;

    return {
      stripeAvailable,
      stripePending,
      allTimeGross,
      thisMonthRevenue,
      monthOverMonth,
      totalCommission,
      thisMonthCommission,
      totalAdRevenue,
      thisMonthAdRevenue,
      mrr,
      activeSubs: activeSubs.length,
      composition,
      trendData,
      last30,
      revenueTrend,
    };
  }, [ordersData, commissionData, adRevenue, subsData, creditPurchases, robuxData, stripeBalance]);

  return (
    <div className="space-y-6">
      {/* Top-level KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Stripe Available"
          value={`£${(metrics.stripeAvailable).toFixed(2)}`}
          subtitle="Ready to withdraw"
          icon={Wallet}
          accentClass="text-emerald-500"
          isLoading={isLoading}
        />
        <MetricCard
          label="This Month Revenue"
          value={`£${metrics.thisMonthRevenue.toFixed(2)}`}
          trend={metrics.monthOverMonth !== 0 ? { value: metrics.monthOverMonth, label: 'vs last month' } : undefined}
          subtitle="Gross product sales"
          icon={TrendingUp}
          accentClass="text-primary"
          isLoading={isLoading}
        />
        <MetricCard
          label="MRR (Eclipse+)"
          value={`£${metrics.mrr.toFixed(2)}`}
          subtitle={`${metrics.activeSubs} active subscribers`}
          icon={PiggyBank}
          accentClass="text-amber-500"
          isLoading={isLoading}
        />
        <MetricCard
          label="Platform Commission"
          value={`£${metrics.thisMonthCommission.toFixed(2)}`}
          subtitle={`£${metrics.totalCommission.toFixed(2)} all time`}
          icon={Percent}
          accentClass="text-blue-500"
          isLoading={isLoading}
        />
      </div>

      {/* Revenue trend + composition donut */}
      <div className="grid gap-4 lg:grid-cols-[1fr,320px]">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                30-Day Revenue Trend
              </CardTitle>
              {!isLoading && (
                <div
                  className={cn(
                    'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
                    metrics.revenueTrend >= 0
                      ? 'text-emerald-600 bg-emerald-500/10'
                      : 'text-red-500 bg-red-500/10'
                  )}
                >
                  {metrics.revenueTrend >= 0 ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {Math.abs(metrics.revenueTrend).toFixed(0)}% vs prev 30d
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <RevolutAreaChart
                data={metrics.trendData}
                xKey="displayDate"
                series={[{ dataKey: 'revenue', color: 'hsl(262 100% 71%)', name: 'Revenue' }]}
                height={200}
                yFormatter={(v) => `£${v}`}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue Composition</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {isLoading ? (
              <Skeleton className="h-[200px] w-[200px] rounded-full" />
            ) : metrics.composition.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12">No revenue data yet</p>
            ) : (
              <>
                <RevolutDonutChart
                  data={metrics.composition}
                  height={180}
                  innerRadius={55}
                  outerRadius={80}
                />
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-4 w-full">
                  {metrics.composition.map((item, i) => (
                    <div key={item.name} className="flex items-center gap-2 text-xs">
                      <div
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: [
                            'hsl(262 100% 71%)',
                            'hsl(220 95% 59%)',
                            'hsl(185 85% 50%)',
                            'hsl(45 93% 58%)',
                            'hsl(330 80% 60%)',
                            'hsl(130 60% 50%)',
                          ][i % 6],
                        }}
                      />
                      <span className="text-muted-foreground truncate">{item.name}</span>
                      <span className="font-medium ml-auto">£{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
