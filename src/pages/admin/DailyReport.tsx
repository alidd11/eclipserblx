import { AdminLayout } from '@/components/admin/AdminLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  BarChart3, TrendingUp, TrendingDown, Calendar,
  RotateCcw, Package, Clock, Banknote, RefreshCw,
  Trophy,
} from 'lucide-react';
import { startOfDay, subDays, startOfMonth, format } from 'date-fns';

interface DailyStats {
  todayRevenue: number;
  todayCount: number;
  yesterdayRevenue: number;
  yesterdayCount: number;
  monthRevenue: number;
  todayRefundTotal: number;
  todayRefundCount: number;
  pendingPayoutTotal: number;
  pendingPayoutCount: number;
  topProducts: { name: string; count: number }[];
}

function useDailyReport() {
  return useQuery({
    queryKey: ['admin-daily-report'],
    queryFn: async (): Promise<DailyStats> => {
      const now = new Date();
      const todayStart = startOfDay(now).toISOString();
      const yesterdayStart = startOfDay(subDays(now, 1)).toISOString();
      const monthStart = startOfMonth(now).toISOString();

      const [todayRes, yesterdayRes, monthRes, refundRes, payoutRes, topRes] = await Promise.all([
        supabase
          .from('orders')
          .select('total', { count: 'exact' })
          .gte('created_at', todayStart)
          .in('status', ['paid', 'completed']),
        supabase
          .from('orders')
          .select('total', { count: 'exact' })
          .gte('created_at', yesterdayStart)
          .lt('created_at', todayStart)
          .in('status', ['paid', 'completed']),
        supabase
          .from('orders')
          .select('total')
          .gte('created_at', monthStart)
          .in('status', ['paid', 'completed']),
        supabase
          .from('refund_requests')
          .select('amount')
          .gte('created_at', todayStart)
          .eq('status', 'approved'),
        supabase
          .from('seller_payouts')
          .select('amount')
          .eq('status', 'pending'),
        supabase
          .from('order_items')
          .select('product_name, quantity')
          .gte('created_at', todayStart),
      ]);

      const todayRevenue = (todayRes.data || []).reduce((s, o) => s + (o.total || 0), 0);
      const yesterdayRevenue = (yesterdayRes.data || []).reduce((s, o) => s + (o.total || 0), 0);
      const monthRevenue = (monthRes.data || []).reduce((s, o) => s + (o.total || 0), 0);
      const todayRefundTotal = (refundRes.data || []).reduce((s, r) => s + (r.amount || 0), 0);
      const pendingPayoutTotal = (payoutRes.data || []).reduce((s, p) => s + (p.amount || 0), 0);

      const productCounts: Record<string, number> = {};
      for (const item of topRes.data || []) {
        const name = item.product_name || 'Unknown';
        productCounts[name] = (productCounts[name] || 0) + (item.quantity || 1);
      }
      const topProducts = Object.entries(productCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      return {
        todayRevenue,
        todayCount: todayRes.count || 0,
        yesterdayRevenue,
        yesterdayCount: yesterdayRes.count || 0,
        monthRevenue,
        todayRefundTotal,
        todayRefundCount: (refundRes.data || []).length,
        pendingPayoutTotal,
        pendingPayoutCount: (payoutRes.data || []).length,
        topProducts,
      };
    },
    staleTime: 2 * 60 * 1000,
  });
}

function StatRow({ icon: Icon, label, value, iconColor }: {
  icon: typeof BarChart3;
  label: string;
  value: string;
  iconColor?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className={`mt-0.5 ${iconColor || 'text-muted-foreground'}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">{value}</p>
      </div>
    </div>
  );
}

function ChangeIndicator({ today, yesterday }: { today: number; yesterday: number }) {
  if (yesterday === 0) return <span className="text-sm text-muted-foreground">No sales yesterday</span>;
  const pct = ((today - yesterday) / yesterday) * 100;
  const isUp = pct >= 0;
  const Icon = isUp ? TrendingUp : TrendingDown;
  return (
    <span className={`text-sm flex items-center gap-1 ${isUp ? 'text-green-500' : 'text-red-500'}`}>
      <Icon className="h-3.5 w-3.5" />
      {isUp ? '+' : ''}{pct.toFixed(1)}% (£{yesterday.toFixed(2)})
    </span>
  );
}

function DailyReportContent() {
  const { data, isLoading, refetch, isFetching } = useDailyReport();
  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Daily Revenue Summary
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {format(now, "d MMM yyyy")} — Live snapshot
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-6 space-y-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : data ? (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Main stats card */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-0">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {format(now, "EEEE, d MMMM yyyy")}
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              <StatRow
                icon={Banknote}
                iconColor="text-yellow-500"
                label="Today's Revenue"
                value={`£${data.todayRevenue.toFixed(2)} (${data.todayCount} orders)`}
              />
              <div className="flex items-start gap-3 py-3">
                <div className="mt-0.5 text-primary">
                  {data.todayRevenue >= data.yesterdayRevenue
                    ? <TrendingUp className="h-5 w-5" />
                    : <TrendingDown className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">vs Yesterday</p>
                  <ChangeIndicator today={data.todayRevenue} yesterday={data.yesterdayRevenue} />
                </div>
              </div>
              <StatRow
                icon={Calendar}
                iconColor="text-blue-500"
                label="Month Total"
                value={`£${data.monthRevenue.toFixed(2)}`}
              />
              <StatRow
                icon={RotateCcw}
                iconColor="text-orange-500"
                label="Refunds Today"
                value={`£${data.todayRefundTotal.toFixed(2)} (${data.todayRefundCount} refunds)`}
              />
              <StatRow
                icon={Package}
                iconColor="text-green-500"
                label="Net Revenue"
                value={`£${(data.todayRevenue - data.todayRefundTotal).toFixed(2)}`}
              />
              <StatRow
                icon={Clock}
                iconColor="text-amber-500"
                label="Pending Payouts"
                value={`£${data.pendingPayoutTotal.toFixed(2)} (${data.pendingPayoutCount} pending)`}
              />
            </CardContent>
          </Card>

          {/* Top products */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                Top Products Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.topProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No sales yet today</p>
              ) : (
                <div className="space-y-2">
                  {data.topProducts.map((p, i) => (
                    <div key={p.name} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="secondary" className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center p-0 text-xs">
                          {i + 1}
                        </Badge>
                        <span className="text-sm text-foreground truncate">{p.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground shrink-0 ml-2">{p.count} sold</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground text-center">
        Eclipse Marketplace • Daily Report
      </p>
    </div>
  );
}

export default function DailyReport() {
  return (
    <AdminLayout requiredPermissions={['view_income']}>
      <DailyReportContent />
    </AdminLayout>
  );
}
