import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Store, ArrowUpDown, CreditCard, Banknote, PiggyBank, TrendingUp, Percent } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format, isAfter, startOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

const trendChartConfig = {
  commission: { label: 'Platform Commission', color: 'hsl(var(--primary))' },
  sellerNet: { label: 'Seller Earnings', color: 'hsl(142 76% 36%)' },
};

export function SellerEarningsTab() {
  // 1. Seller transactions aggregate
  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['admin-seller-tx-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seller_transactions')
        .select('gross_amount, platform_fee, stripe_fee, net_amount, created_at')
        .eq('type', 'sale')
        .is('refunded_at', null);
      if (error) throw error;
      return data ?? [];
    },
  });

  // 2. Seller balances aggregate
  const { data: balanceData, isLoading: balLoading } = useQuery({
    queryKey: ['admin-seller-balances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seller_balances')
        .select('available_balance, total_earned, total_paid');
      if (error) throw error;
      return data ?? [];
    },
  });

  // 3. Top stores by revenue
  const { data: topStores, isLoading: storesLoading } = useQuery({
    queryKey: ['admin-top-stores-revenue'],
    queryFn: async () => {
      const { data: txs, error: txErr } = await supabase
        .from('seller_transactions')
        .select('store_id, gross_amount, platform_fee, net_amount')
        .eq('type', 'sale')
        .is('refunded_at', null);
      if (txErr) throw txErr;

      // Group by store
      const storeMap: Record<string, { gross: number; commission: number; net: number }> = {};
      (txs ?? []).forEach(tx => {
        if (!storeMap[tx.store_id]) storeMap[tx.store_id] = { gross: 0, commission: 0, net: 0 };
        storeMap[tx.store_id].gross += tx.gross_amount ?? 0;
        storeMap[tx.store_id].commission += tx.platform_fee ?? 0;
        storeMap[tx.store_id].net += tx.net_amount ?? 0;
      });

      // Get store names
      const storeIds = Object.keys(storeMap);
      if (storeIds.length === 0) return [];
      const { data: stores } = await supabase
        .from('stores')
        .select('id, name')
        .in('id', storeIds);

      const nameMap: Record<string, string> = {};
      (stores ?? []).forEach(s => { nameMap[s.id] = s.name; });

      return Object.entries(storeMap)
        .map(([id, v]) => ({ id, name: nameMap[id] ?? 'Unknown', ...v }))
        .sort((a, b) => b.gross - a.gross)
        .slice(0, 10);
    },
  });

  // 4. Payout pipeline
  const { data: payoutPipeline, isLoading: payoutLoading } = useQuery({
    queryKey: ['admin-payout-pipeline'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seller_payouts')
        .select('status, amount');
      if (error) throw error;

      const pipeline: Record<string, { count: number; total: number }> = {
        pending: { count: 0, total: 0 },
        processing: { count: 0, total: 0 },
        awaiting_funds: { count: 0, total: 0 },
        completed: { count: 0, total: 0 },
        rejected: { count: 0, total: 0 },
      };
      (data ?? []).forEach(p => {
        const s = p.status ?? 'pending';
        if (!pipeline[s]) pipeline[s] = { count: 0, total: 0 };
        pipeline[s].count += 1;
        pipeline[s].total += p.amount ?? 0;
      });
      return pipeline;
    },
  });

  // Summary cards computed
  const summary = useMemo(() => {
    if (!txData) return null;
    const totalCommission = txData.reduce((s, t) => s + (t.platform_fee ?? 0), 0);
    const totalSellerEarnings = txData.reduce((s, t) => s + (t.net_amount ?? 0), 0);
    const totalStripeFees = txData.reduce((s, t) => s + (t.stripe_fee ?? 0), 0);
    const totalGross = txData.reduce((s, t) => s + (t.gross_amount ?? 0), 0);

    return { totalCommission, totalSellerEarnings, totalStripeFees, totalGross };
  }, [txData]);

  const balanceSummary = useMemo(() => {
    if (!balanceData) return null;
    const outstanding = balanceData.reduce((s, b) => s + (b.available_balance ?? 0), 0);
    const totalPaid = balanceData.reduce((s, b) => s + (b.total_paid ?? 0), 0);
    return { outstanding, totalPaid };
  }, [balanceData]);

  // Time-period breakdown
  const periodBreakdown = useMemo(() => {
    if (!txData) return null;
    const now = new Date();
    const periods = [
      { label: 'Today', filter: (d: string) => isAfter(new Date(d), startOfDay(now)) },
      { label: '7 Days', filter: (d: string) => isAfter(new Date(d), subDays(now, 7)) },
      { label: '30 Days', filter: (d: string) => isAfter(new Date(d), subDays(now, 30)) },
      { label: 'All Time', filter: () => true },
    ];
    return periods.map(p => {
      const filtered = txData.filter(t => p.filter(t.created_at ?? ''));
      return {
        label: p.label,
        commission: filtered.reduce((s, t) => s + (t.platform_fee ?? 0), 0),
        sellerEarnings: filtered.reduce((s, t) => s + (t.net_amount ?? 0), 0),
        gross: filtered.reduce((s, t) => s + (t.gross_amount ?? 0), 0),
      };
    });
  }, [txData]);

  // 30-day trend
  const trendData = useMemo(() => {
    if (!txData) return [];
    const dailyMap: Record<string, { commission: number; sellerNet: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      dailyMap[date] = { commission: 0, sellerNet: 0 };
    }
    txData.forEach(t => {
      const date = format(new Date(t.created_at ?? ''), 'yyyy-MM-dd');
      if (dailyMap[date]) {
        dailyMap[date].commission += t.platform_fee ?? 0;
        dailyMap[date].sellerNet += t.net_amount ?? 0;
      }
    });
    return Object.entries(dailyMap).map(([date, v]) => ({
      date,
      displayDate: format(new Date(date), 'MMM d'),
      ...v,
    }));
  }, [txData]);

  const isLoading = txLoading || balLoading;

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-600',
    processing: 'bg-blue-500/10 text-blue-600',
    awaiting_funds: 'bg-orange-500/10 text-orange-600',
    completed: 'bg-green-500/10 text-green-600',
    rejected: 'bg-red-500/10 text-red-600',
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-4"><Skeleton className="h-16 w-full" /></Card>
          ))
        ) : (
          <>
            <AdminStatCard
              label="Platform Commission"
              value={`£${(summary?.totalCommission ?? 0).toFixed(2)}`}
              valueColor="primary"
              subtitle="Your cut from sales"
            />
            <AdminStatCard
              label="Seller Earnings"
              value={`£${(summary?.totalSellerEarnings ?? 0).toFixed(2)}`}
              valueColor="green"
              subtitle="Net earned by sellers"
            />
            <AdminStatCard
              label="Outstanding Balances"
              value={`£${(balanceSummary?.outstanding ?? 0).toFixed(2)}`}
              valueColor="yellow"
              subtitle="Owed to sellers"
            />
            <AdminStatCard
              label="Total Paid Out"
              value={`£${(balanceSummary?.totalPaid ?? 0).toFixed(2)}`}
              valueColor="blue"
              subtitle="Paid to sellers"
            />
            <AdminStatCard
              label="Stripe Fees (Seller)"
              value={`£${(summary?.totalStripeFees ?? 0).toFixed(2)}`}
              valueColor="destructive"
              subtitle="Fees on seller sales"
            />
          </>
        )}
      </div>

      {/* Period Breakdown + Payout Pipeline */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Period Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4" />
              Period Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!periodBreakdown ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead className="text-right">Seller Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periodBreakdown.map(p => (
                    <TableRow key={p.label}>
                      <TableCell className="font-medium">{p.label}</TableCell>
                      <TableCell className="text-right">£{p.gross.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-primary">£{p.commission.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-green-600">£{p.sellerEarnings.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Payout Pipeline */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              Payout Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payoutLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="space-y-3">
                {Object.entries(payoutPipeline ?? {}).map(([status, data]) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={statusColors[status] ?? ''}>
                        {status.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{data.count} payout{data.count !== 1 ? 's' : ''}</span>
                    </div>
                    <span className="font-medium">£{data.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 30-Day Trend Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            30-Day Commission vs Seller Earnings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trendData.length === 0 ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ChartContainer config={trendChartConfig} className="h-64 w-full">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="displayDate" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <YAxis tickFormatter={(v) => `£${v}`} tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="commission" stroke="var(--color-commission)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="sellerNet" stroke="var(--color-sellerNet)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Top Stores by Revenue */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Store className="h-4 w-4" />
            Top Stores by Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          {storesLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : !topStores?.length ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No seller transactions yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead className="text-right">Gross Sales</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead className="text-right">Seller Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topStores.map((store, i) => (
                  <TableRow key={store.id}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{store.name}</TableCell>
                    <TableCell className="text-right">£{store.gross.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-primary">£{store.commission.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-green-600">£{store.net.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
