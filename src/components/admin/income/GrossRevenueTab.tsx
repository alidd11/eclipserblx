import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, startOfWeek, startOfMonth, startOfYear, isAfter, subDays, format } from 'date-fns';
import { RevolutLineChart } from '@/components/ui/revolut-chart';

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
      const calc = (fn: (o: typeof paidOrders[0]) => boolean) => {
        const filtered = paidOrders.filter(fn);
        return { gross: filtered.reduce((s, o) => s + (o.total || 0), 0), orderCount: filtered.length };
      };

      return {
        daily: calc(o => isAfter(new Date(o.created_at), startOfDay(now))),
        weekly: calc(o => isAfter(new Date(o.created_at), startOfWeek(now, { weekStartsOn: 1 }))),
        monthly: calc(o => isAfter(new Date(o.created_at), startOfMonth(now))),
        yearly: calc(o => isAfter(new Date(o.created_at), startOfYear(now))),
        allTime: calc(() => true),
      };
    },
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
        const d = format(new Date(o.created_at), 'yyyy-MM-dd');
        if (dailyData[d]) { dailyData[d].total += o.total || 0; dailyData[d].orderCount++; }
      });
      return Object.entries(dailyData).map(([date, v]) => ({
        date,
        displayDate: format(new Date(date), 'MMM d'),
        total: v.total,
        orderCount: v.orderCount,
      }));
    },
  });

  const stats = useMemo(() => {
    if (!incomeTrend) return null;
    const total30d = incomeTrend.reduce((s, d) => s + d.total, 0);
    const bestDay = Math.max(...incomeTrend.map(d => d.total), 0);
    return { total30d, bestDay, avg: total30d / 30 };
  }, [incomeTrend]);

  const isLoading = breakdownLoading || trendLoading;

  const periods = [
    { label: 'Today', value: incomeBreakdown?.daily.gross, color: 'green' as const },
    { label: 'This Week', value: incomeBreakdown?.weekly.gross, color: 'blue' as const },
    { label: 'This Month', value: incomeBreakdown?.monthly.gross, color: 'primary' as const },
    { label: 'This Year', value: incomeBreakdown?.yearly.gross, color: 'yellow' as const },
    { label: 'All Time', value: incomeBreakdown?.allTime.gross, color: 'default' as const },
  ];

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
            />
          ))
        )}
      </div>

      {/* Chart + Stats */}
      <div className="grid gap-4 lg:grid-cols-[1fr,280px]">
        <Card>
          <CardHeader>
            <CardTitle>30-Day Gross Revenue Trend</CardTitle>
            <CardDescription>Daily gross revenue over the past 30 days</CardDescription>
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
                tooltipFormatter={(v) => [`£${v.toFixed(2)}`, 'Gross Revenue']}
              />
            )}
          </CardContent>
        </Card>

        {stats && (
          <div className="flex flex-col gap-4">
            <AdminStatCard label="30-Day Total" value={`£${stats.total30d.toFixed(2)}`} valueColor="primary" />
            <AdminStatCard label="Daily Average" value={`£${stats.avg.toFixed(2)}`} />
            <AdminStatCard label="Best Day (30d)" value={`£${stats.bestDay.toFixed(2)}`} valueColor="green" />
          </div>
        )}
      </div>
    </div>
  );
}
