import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { IncomeErrorState } from './IncomeErrorState';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, startOfWeek, startOfMonth, startOfYear, isAfter, subDays, format } from '@/lib/dateUtils';
import { RevolutLineChart } from '@/components/ui/revolut-chart';
import { cn } from '@/lib/utils';

export function GrossRevenueTab() {
  const { data: incomeBreakdown, isLoading: breakdownLoading, isError: breakdownError, refetch: refetchBreakdown } = useQuery({
    queryKey: ['admin-income-breakdown'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('total, status, created_at')
        .in('status', ['paid', 'fulfilled', 'completed']);
      if (error) throw error;

      const now = new Date();
      const paidOrders = data ?? [];
      const safeParse = (d: string | null) => {
        if (!d) return null;
        const date = new Date(d);
        return isNaN(date.getTime()) ? null : date;
      };
      const calc = (fn: (o: typeof paidOrders[0]) => boolean) => {
        const filtered = paidOrders.filter(fn);
        return { gross: filtered.reduce((s, o) => s + (Number(o.total) || 0), 0), orderCount: filtered.length };
      };

      return {
        daily: calc(o => { const d = safeParse(o.created_at); return !!d && isAfter(d, startOfDay(now)); }),
        weekly: calc(o => { const d = safeParse(o.created_at); return !!d && isAfter(d, startOfWeek(now, { weekStartsOn: 1 })); }),
        monthly: calc(o => { const d = safeParse(o.created_at); return !!d && isAfter(d, startOfMonth(now)); }),
        yearly: calc(o => { const d = safeParse(o.created_at); return !!d && isAfter(d, startOfYear(now)); }),
        allTime: calc(() => true),
      };
    },
    staleTime: 60000,
    retry: 2,
  });

  const { data: incomeTrend, isLoading: trendLoading, isError: trendError, refetch: refetchTrend } = useQuery({
    queryKey: ['admin-income-trend'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('total, created_at')
        .in('status', ['paid', 'fulfilled', 'completed'])
        .gte('created_at', subDays(new Date(), 30).toISOString());
      if (error) throw error;

      const dailyData: Record<string, { total: number; orderCount: number }> = {};
      for (let i = 29; i >= 0; i--) {
        dailyData[format(subDays(new Date(), i), 'yyyy-MM-dd')] = { total: 0, orderCount: 0 };
      }
      (data ?? []).forEach(o => {
        if (!o.created_at) return;
        const d = format(new Date(o.created_at), 'yyyy-MM-dd');
        if (dailyData[d]) { dailyData[d].total += Number(o.total) || 0; dailyData[d].orderCount++; }
      });
      return Object.entries(dailyData).map(([date, v]) => ({
        date,
        displayDate: format(new Date(date), 'MMM d'),
        total: v.total,
        orderCount: v.orderCount,
      }));
    },
    staleTime: 60000,
    retry: 2,
  });

  const stats = useMemo(() => {
    if (!incomeTrend) return null;
    const total30d = incomeTrend.reduce((s, d) => s + d.total, 0);
    const bestDay = Math.max(...incomeTrend.map(d => d.total), 0);
    const totalOrders30d = incomeTrend.reduce((s, d) => s + d.orderCount, 0);
    const avgOrderValue = totalOrders30d > 0 ? total30d / totalOrders30d : 0;

    // Compare first 15 days vs last 15 days for mini-trend
    const firstHalf = incomeTrend.slice(0, 15).reduce((s, d) => s + d.total, 0);
    const secondHalf = incomeTrend.slice(15).reduce((s, d) => s + d.total, 0);
    const halfTrend = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;

    return { total30d, bestDay, avg: total30d / 30, avgOrderValue, halfTrend, totalOrders30d };
  }, [incomeTrend]);

  const isLoading = breakdownLoading || trendLoading;

  const periods = [
    { label: 'Today', value: incomeBreakdown?.daily.gross, orders: incomeBreakdown?.daily.orderCount, color: 'green' as const },
    { label: 'This Week', value: incomeBreakdown?.weekly.gross, orders: incomeBreakdown?.weekly.orderCount, color: 'blue' as const },
    { label: 'This Month', value: incomeBreakdown?.monthly.gross, orders: incomeBreakdown?.monthly.orderCount, color: 'primary' as const },
    { label: 'This Year', value: incomeBreakdown?.yearly.gross, orders: incomeBreakdown?.yearly.orderCount, color: 'yellow' as const },
    { label: 'All Time', value: incomeBreakdown?.allTime.gross, orders: incomeBreakdown?.allTime.orderCount, color: 'default' as const },
  ];

  if (breakdownError || trendError) {
    return <IncomeErrorState title="Failed to load revenue data" onRetry={() => { refetchBreakdown(); refetchTrend(); }} />;
  }

  return (
    <div className="space-y-6">
      {/* Period Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-4"><Skeleton className="h-16 w-full" /></Card>
          ))
        ) : (
          periods.map(p => (
            <AdminStatCard
              key={p.label}
              label={p.label}
              value={`£${(p.value ?? 0).toFixed(2)}`}
              valueColor={p.color}
              subtitle={`${p.orders ?? 0} order${(p.orders ?? 0) !== 1 ? 's' : ''}`}
            />
          ))
        )}
      </div>

      {/* Chart + Stats */}
      <div className="grid gap-4 lg:grid-cols-[1fr,280px]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>30-Day Gross Revenue Trend</CardTitle>
                <CardDescription>Daily gross revenue over the past 30 days</CardDescription>
              </div>
              {stats && (
                <div
                  className={cn(
                    'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
                    stats.halfTrend >= 0
                      ? 'text-emerald-600 bg-emerald-500/10'
                      : 'text-red-500 bg-red-500/10'
                  )}
                >
                  {stats.halfTrend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(stats.halfTrend).toFixed(0)}% momentum
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <RevolutLineChart
                data={incomeTrend ?? []}
                xKey="displayDate"
                series={[{ dataKey: 'total', color: 'hsl(262 100% 71%)', name: 'Gross Revenue' }]}
                height={300}
                yFormatter={(v) => `£${v}`}
                tooltipFormatter={(v) => [`£${Number(v).toFixed(2)}`, 'Gross Revenue']}
              />
            )}
          </CardContent>
        </Card>

        {stats && (
          <div className="flex flex-col gap-4">
            <AdminStatCard label="30-Day Total" value={`£${stats.total30d.toFixed(2)}`} valueColor="primary" />
            <AdminStatCard label="Daily Average" value={`£${stats.avg.toFixed(2)}`} subtitle={`${stats.totalOrders30d} orders`} />
            <AdminStatCard label="Avg Order Value" value={`£${stats.avgOrderValue.toFixed(2)}`} valueColor="blue" />
            <AdminStatCard label="Best Day (30d)" value={`£${stats.bestDay.toFixed(2)}`} valueColor="green" />
          </div>
        )}
      </div>
    </div>
  );
}
