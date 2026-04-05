import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  DollarSign, ShoppingCart, CreditCard, Megaphone, Crown, Gamepad2, Percent,
  ArrowUpRight, ArrowDownRight, Search, Filter, Download,
  TrendingUp, Calendar
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useIsInsideHub } from '@/components/admin/AdminHubContext';
import { format, subDays, startOfMonth, startOfYear, isAfter, differenceInDays } from 'date-fns';
import { showSuccessNotification } from '@/lib/nativeNotification';
import { cn } from '@/lib/utils';
import { RevolutAreaChart } from '@/components/ui/revolut-chart';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

const ROBUX_TO_GBP_RATE = 0.00275;

type IncomeSource = 'all' | 'orders' | 'subscriptions' | 'ads' | 'credits' | 'robux' | 'commission';
type TimePeriod = '7d' | '30d' | 'month' | 'year' | 'all';

interface UnifiedTransaction {
  id: string;
  source: IncomeSource;
  description: string;
  amount: number;
  currency: string;
  status: string;
  date: string;
  metadata?: string;
}

const sourceConfig: Record<Exclude<IncomeSource, 'all'>, { label: string; icon: typeof ShoppingCart; color: string; chartColor: string; badgeVariant: string }> = {
  orders: { label: 'Product Sales', icon: ShoppingCart, color: 'text-emerald-500', chartColor: 'hsl(152, 69%, 53%)', badgeVariant: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  subscriptions: { label: 'Eclipse+', icon: Crown, color: 'text-amber-500', chartColor: 'hsl(38, 92%, 50%)', badgeVariant: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  ads: { label: 'Advertising', icon: Megaphone, color: 'text-blue-500', chartColor: 'hsl(217, 91%, 60%)', badgeVariant: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  credits: { label: 'Credit Purchases', icon: CreditCard, color: 'text-purple-500', chartColor: 'hsl(262, 100%, 71%)', badgeVariant: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  robux: { label: 'Robux', icon: Gamepad2, color: 'text-red-500', chartColor: 'hsl(0, 84%, 60%)', badgeVariant: 'bg-red-500/10 text-red-500 border-red-500/20' },
  commission: { label: 'Commission', icon: Percent, color: 'text-orange-500', chartColor: 'hsl(25, 95%, 53%)', badgeVariant: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
};

const sourceKeys = Object.keys(sourceConfig) as Exclude<IncomeSource, 'all'>[];

/* ── Tiny sparkline for source cards ── */
function Sparkline({ data, color, height = 32 }: { data: number[]; color: string; height?: number }) {
  const chartData = data.map((v, i) => ({ v, i }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`spark-${color.replace(/[^a-z0-9]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#spark-${color.replace(/[^a-z0-9]/gi, '')})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function AdminIncomeSources() {
  const isInsideHub = useIsInsideHub();
  const [sourceFilter, setSourceFilter] = useState<IncomeSource>('all');
  const [periodFilter, setPeriodFilter] = useState<TimePeriod>('30d');
  const [searchQuery, setSearchQuery] = useState('');
  const [incomeTab, setIncomeTab] = useState('trend');

  const periodStart = useMemo(() => {
    const now = new Date();
    switch (periodFilter) {
      case '7d': return subDays(now, 7);
      case '30d': return subDays(now, 30);
      case 'month': return startOfMonth(now);
      case 'year': return startOfYear(now);
      case 'all': return new Date('2020-01-01');
    }
  }, [periodFilter]);

  const periodDays = useMemo(() => Math.max(1, differenceInDays(new Date(), periodStart)), [periodStart]);

  // Fetch all income data in parallel
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['income-sources-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, total, status, created_at, user_id')
        .in('status', ['paid', 'fulfilled', 'completed'])
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60000,
    retry: 2,
  });

  const { data: subsData, isLoading: subsLoading } = useQuery({
    queryKey: ['income-sources-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('id, user_id, status, tier, billing_period, created_at, stripe_subscription_id')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60000,
    retry: 2,
  });

  const { data: adsData, isLoading: adsLoading } = useQuery({
    queryKey: ['income-sources-ads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('advertisement_subscriptions')
        .select('id, user_id, tier, status, billing_period, payment_method, created_at')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60000,
    retry: 2,
  });

  const { data: creditsData, isLoading: creditsLoading } = useQuery({
    queryKey: ['income-sources-credits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('id, user_id, amount, type, description, created_at, reference_id')
        .eq('type', 'purchase')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60000,
    retry: 2,
  });

  const { data: robuxData, isLoading: robuxLoading } = useQuery({
    queryKey: ['income-sources-robux'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('robux_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60000,
    retry: 2,
  });

  const { data: commissionData, isLoading: commissionLoading } = useQuery({
    queryKey: ['income-sources-commission'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seller_transactions')
        .select('id, order_id, seller_id, store_id, gross_amount, platform_fee, net_amount, stripe_fee, type, status, description, created_at, stores(name)')
        .eq('type', 'sale')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60000,
    retry: 2,
  });

  const adTierPricing: Record<string, number> = { basic: 4.99, pro: 9.99, premium: 19.99 };
  const eclipsePricing = { monthly: 4.99, annual: 49.99 };

  // Build unified transaction list
  const allTransactions = useMemo<UnifiedTransaction[]>(() => {
    const txns: UnifiedTransaction[] = [];

    (ordersData ?? []).forEach(o => {
      txns.push({
        id: o.id, source: 'orders',
        description: `Order ${o.id.slice(0, 8)}`,
        amount: o.total ?? 0, currency: '£', status: o.status, date: o.created_at,
        metadata: o.user_id ? o.user_id.slice(0, 8) : undefined,
      });
    });

    (subsData ?? []).forEach(s => {
      const price = s.billing_period === 'annual' ? eclipsePricing.annual : eclipsePricing.monthly;
      txns.push({
        id: s.id, source: 'subscriptions',
        description: `Eclipse+ ${(s.tier ?? 'plus')} (${s.billing_period ?? 'monthly'})`,
        amount: price, currency: '£', status: s.status, date: s.created_at,
        metadata: s.stripe_subscription_id ?? undefined,
      });
    });

    (adsData ?? []).forEach(a => {
      const price = adTierPricing[a.tier] ?? 0;
      txns.push({
        id: a.id, source: 'ads',
        description: `Ad ${a.tier} (${a.billing_period ?? 'monthly'})`,
        amount: price, currency: '£', status: a.status, date: a.created_at,
        metadata: a.payment_method ?? undefined,
      });
    });

    (creditsData ?? []).forEach(c => {
      txns.push({
        id: c.id, source: 'credits',
        description: c.description ?? 'Credit Purchase',
        amount: c.amount ?? 0, currency: '£', status: 'completed', date: c.created_at,
        metadata: c.reference_id ?? undefined,
      });
    });

    (robuxData ?? []).forEach(r => {
      txns.push({
        id: r.id, source: 'robux',
        description: `Robux: R$${r.robux_amount ?? 0}`,
        amount: (r.robux_after_tax ?? 0) * ROBUX_TO_GBP_RATE,
        currency: '£', status: 'completed', date: r.created_at,
        metadata: `R$${r.robux_amount ?? 0} → R$${r.robux_after_tax ?? 0} net`,
      });
    });

    (commissionData ?? []).forEach(c => {
      const platformFee = c.platform_fee ?? 0;
      if (platformFee <= 0) return;
      const storeName = (c as any).stores?.name ?? 'Unknown Store';
      txns.push({
        id: `comm-${c.id}`, source: 'commission',
        description: `Commission on £${(c.gross_amount ?? 0).toFixed(2)} sale · ${storeName}`,
        amount: platformFee, currency: '£', status: c.status ?? 'completed', date: c.created_at,
        metadata: `${storeName} · Seller earned £${(c.net_amount ?? 0).toFixed(2)} · Stripe fee £${(c.stripe_fee ?? 0).toFixed(2)}`,
      });
    });

    return txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [ordersData, subsData, adsData, creditsData, robuxData, commissionData]);

  // Filter by period, source, and search
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(t => {
      if (sourceFilter !== 'all' && t.source !== sourceFilter) return false;
      if (!isAfter(new Date(t.date), periodStart)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return t.description.toLowerCase().includes(q) || 
               t.id.toLowerCase().includes(q) ||
               (t.metadata?.toLowerCase().includes(q) ?? false);
      }
      return true;
    });
  }, [allTransactions, sourceFilter, periodStart, searchQuery]);

  // Summary per source with enhanced metrics
  const summaryBySource = useMemo(() => {
    const summary: Record<Exclude<IncomeSource, 'all'>, { total: number; count: number; prev: number; prevCount: number; maxTxn: number; sparkline: number[] }> = {
      orders: { total: 0, count: 0, prev: 0, prevCount: 0, maxTxn: 0, sparkline: [] },
      subscriptions: { total: 0, count: 0, prev: 0, prevCount: 0, maxTxn: 0, sparkline: [] },
      ads: { total: 0, count: 0, prev: 0, prevCount: 0, maxTxn: 0, sparkline: [] },
      credits: { total: 0, count: 0, prev: 0, prevCount: 0, maxTxn: 0, sparkline: [] },
      robux: { total: 0, count: 0, prev: 0, prevCount: 0, maxTxn: 0, sparkline: [] },
      commission: { total: 0, count: 0, prev: 0, prevCount: 0, maxTxn: 0, sparkline: [] },
    };

    const periodMs = new Date().getTime() - periodStart.getTime();
    const prevStart = new Date(periodStart.getTime() - periodMs);

    // Build sparkline buckets (7 buckets)
    const bucketCount = 7;
    const bucketMs = periodMs / bucketCount;
    const sparkBuckets: Record<string, number[]> = {};
    sourceKeys.forEach(k => { sparkBuckets[k] = new Array(bucketCount).fill(0); });

    allTransactions.forEach(t => {
      if (t.source === 'all') return;
      const txDate = new Date(t.date);
      if (isAfter(txDate, periodStart)) {
        summary[t.source].total += t.amount;
        summary[t.source].count += 1;
        summary[t.source].maxTxn = Math.max(summary[t.source].maxTxn, t.amount);
        // Sparkline bucket
        const bucketIdx = Math.min(bucketCount - 1, Math.floor((txDate.getTime() - periodStart.getTime()) / bucketMs));
        sparkBuckets[t.source][bucketIdx] += t.amount;
      } else if (isAfter(txDate, prevStart)) {
        summary[t.source].prev += t.amount;
        summary[t.source].prevCount += 1;
      }
    });

    sourceKeys.forEach(k => { summary[k].sparkline = sparkBuckets[k]; });

    return summary;
  }, [allTransactions, periodStart]);

  // Stacked trend data for chart
  const trendData = useMemo(() => {
    const bucketCount = Math.min(periodDays, 30);
    const bucketMs = (new Date().getTime() - periodStart.getTime()) / bucketCount;
    const buckets: Record<string, any>[] = [];

    for (let i = 0; i < bucketCount; i++) {
      const bucketDate = new Date(periodStart.getTime() + bucketMs * (i + 0.5));
      const entry: any = { date: format(bucketDate, bucketCount > 14 ? 'MMM d' : 'EEE d') };
      sourceKeys.forEach(k => { entry[k] = 0; });
      buckets.push(entry);
    }

    allTransactions.forEach(t => {
      if (t.source === 'all') return;
      const txDate = new Date(t.date);
      if (!isAfter(txDate, periodStart)) return;
      const idx = Math.min(bucketCount - 1, Math.floor((txDate.getTime() - periodStart.getTime()) / bucketMs));
      buckets[idx][t.source] += t.amount;
    });

    return buckets;
  }, [allTransactions, periodStart, periodDays]);

  const grandTotal = Object.values(summaryBySource).reduce((sum, s) => sum + s.total, 0);
  const isLoading = ordersLoading || subsLoading || adsLoading || creditsLoading || robuxLoading || commissionLoading;

  const exportCSV = () => {
    const headers = ['Date', 'Source', 'Description', 'Amount (£)', 'Status', 'ID'];
    const rows = filteredTransactions.map(t => [
      format(new Date(t.date), 'yyyy-MM-dd HH:mm'),
      sourceConfig[t.source as Exclude<IncomeSource, 'all'>]?.label ?? t.source,
      t.description, t.amount.toFixed(2), t.status, t.id,
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `income-sources-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccessNotification('Exported', 'Income sources report downloaded.');
  };

  const periodLabels: Record<TimePeriod, string> = {
    '7d': 'Last 7 Days', '30d': 'Last 30 Days',
    'month': 'This Month', 'year': 'This Year', 'all': 'All Time',
  };

  // Build stacked area series for the chart
  const areaSeries = sourceKeys.map(k => ({
    dataKey: k,
    color: sourceConfig[k].chartColor,
    name: sourceConfig[k].label,
    gradientId: `grad-${k}`,
  }));

  return (
    <AdminLayout requiredPermissions={['view_income']}>
      <div className="space-y-6 w-full">
        {/* Page header */}
        {!isInsideHub && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-display font-bold">Income Sources</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Revenue breakdown across all platform streams
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as TimePeriod)}>
                <SelectTrigger className="w-auto min-w-[140px] h-8 text-xs">
                  <Calendar className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(periodLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={exportCSV} className="h-8 text-xs">
                <Download className="h-3 w-3 mr-1" /> Export
              </Button>
            </div>
          </div>
        )}


        {/* Grand total */}
        <div className="border border-border rounded-xl overflow-hidden bg-card border-border">
          <div className="p-4 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                  Total Revenue ({periodLabels[periodFilter]})
                </p>
                {isLoading ? (
                  <Skeleton className="h-9 w-32 mt-1" />
                ) : (
                  <p className="text-3xl font-bold font-display">£{grandTotal.toFixed(2)}</p>
                )}
                {!isLoading && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {filteredTransactions.length} transactions · £{(grandTotal / periodDays).toFixed(2)}/day avg
                  </p>
                )}
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced source breakdown cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {sourceKeys.map(key => {
            const config = sourceConfig[key];
            const data = summaryBySource[key];
            const change = data.prev > 0 ? ((data.total - data.prev) / data.prev) * 100 : 0;
            const avgTxn = data.count > 0 ? data.total / data.count : 0;
            const sharePercent = grandTotal > 0 ? (data.total / grandTotal) * 100 : 0;
            const Icon = config.icon;

            return (
              <div 
                key={key} 
                className={cn(
                  "bg-card border-border cursor-pointer transition-all hover:border-primary/30 overflow-hidden",
                  sourceFilter === key && "border-primary ring-1 ring-primary/20"
                )}
                onClick={() => setSourceFilter(sourceFilter === key ? 'all' : key)}
              >
                <div className="p-4 pt-4 pb-2 px-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", config.badgeVariant.split(' ')[0])}>
                        <Icon className={cn("h-3.5 w-3.5", config.color)} />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">{config.label}</span>
                    </div>
                    {change !== 0 && periodFilter !== 'all' && !isLoading && (
                      <span className={cn("text-[10px] flex items-center gap-0.5 font-medium", change > 0 ? "text-emerald-500" : "text-red-500")}>
                        {change > 0 ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                        {Math.abs(change).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  {isLoading ? (
                    <Skeleton className="h-6 w-20 mt-2" />
                  ) : (
                    <>
                      <p className="text-xl font-bold mt-1">£{data.total.toFixed(2)}</p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span>{data.count} txns</span>
                        <span>·</span>
                        <span>Avg £{avgTxn.toFixed(2)}</span>
                        <span>·</span>
                        <span>{sharePercent.toFixed(0)}% share</span>
                      </div>
                      {data.maxTxn > 0 && (
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                          Largest: £{data.maxTxn.toFixed(2)}
                        </p>
                      )}
                      {/* Sparkline */}
                      <div className="mt-2 -mx-1">
                        <Sparkline data={data.sparkline} color={config.chartColor} height={28} />
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <Tabs value={incomeTab} onValueChange={setIncomeTab} className="space-y-4">
          <TabsList className="hidden sm:inline-flex">
            <TabsTrigger value="trend" className="gap-1.5 text-xs">
              <TrendingUp className="h-3.5 w-3.5" />
              Revenue Trend
            </TabsTrigger>
            <TabsTrigger value="ledger" className="gap-1.5 text-xs">
              <DollarSign className="h-3.5 w-3.5" />
              Transaction Ledger
            </TabsTrigger>
          </TabsList>
          <div className="sm:hidden">
            <Select value={incomeTab} onValueChange={setIncomeTab}>
              <SelectTrigger className="w-auto min-w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trend">Revenue Trend</SelectItem>
                <SelectItem value="ledger">Transaction Ledger</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Revenue trend stacked area chart */}
          <TabsContent value="trend">
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <h3 className="font-semibold text-sm text-base">Revenue by Source Over Time</h3>
                <p className="text-xs text-muted-foreground mt-0.5 text-xs">Stacked view of all income streams ({periodLabels[periodFilter]})</p>
              </div>
              <div className="p-4">
                {isLoading ? (
                  <Skeleton className="h-[320px] w-full" />
                ) : (
                  <RevolutAreaChart
                    data={trendData}
                    xKey="date"
                    series={areaSeries}
                    height={320}
                    yFormatter={(v) => `£${v}`}
                    tooltipFormatter={(v) => [`£${Number(v).toFixed(2)}`, 'Revenue']}
                  />
                )}
              </div>
            </div>
          </TabsContent>

          {/* Transaction ledger */}
          <TabsContent value="ledger">
            <div className="border border-border rounded-xl overflow-hidden bg-card border-border">
              <div className="px-4 py-3 border-b border-border bg-muted/30 pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-sm text-base">Transaction Ledger</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 text-xs">
                      {filteredTransactions.length} transactions
                      {sourceFilter !== 'all' && ` · ${sourceConfig[sourceFilter]?.label}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <Input 
                        placeholder="Search..." 
                        className="h-8 text-xs pl-7 w-[180px]"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as IncomeSource)}>
                      <SelectTrigger className="w-auto min-w-[140px] h-8 text-xs">
                        <Filter className="h-3 w-3 mr-1" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sources</SelectItem>
                        {Object.entries(sourceConfig).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="p-4 p-0">
                <ScrollArea className="h-[500px]">
                  {/* Desktop table */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-[11px] w-[140px]">Date</TableHead>
                          <TableHead className="text-[11px] w-[110px]">Source</TableHead>
                          <TableHead className="text-[11px]">Description</TableHead>
                          <TableHead className="text-[11px] text-right w-[90px]">Amount</TableHead>
                          <TableHead className="text-[11px] w-[80px]">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          Array.from({ length: 8 }).map((_, i) => (
                            <TableRow key={i}>
                              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                            </TableRow>
                          ))
                        ) : filteredTransactions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-12">
                              No transactions found for the selected filters.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredTransactions.slice(0, 200).map(txn => {
                            const cfg = sourceConfig[txn.source as Exclude<IncomeSource, 'all'>];
                            const TxnIcon = cfg?.icon ?? DollarSign;
                            return (
                              <TableRow key={`${txn.source}-${txn.id}`} className="group">
                                <TableCell className="text-[11px] text-muted-foreground">
                                  {format(new Date(txn.date), 'dd MMM yyyy HH:mm')}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={cn("text-[10px] gap-1 border", cfg?.badgeVariant)}>
                                    <TxnIcon className="h-2.5 w-2.5" />
                                    {cfg?.label?.split(' ')[0]}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <p className="text-xs truncate max-w-[250px]">{txn.description}</p>
                                  {txn.metadata && (
                                    <p className="text-[10px] text-muted-foreground/60 truncate max-w-[250px]">{txn.metadata}</p>
                                  )}
                                </TableCell>
                                <TableCell className="text-right text-xs font-medium tabular-nums">
                                  {txn.currency}{txn.amount.toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "text-[10px]",
                                      txn.status === 'active' || txn.status === 'paid' || txn.status === 'completed' || txn.status === 'fulfilled'
                                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                        : txn.status === 'cancelled' || txn.status === 'expired'
                                        ? "bg-red-500/10 text-red-500 border-red-500/20"
                                        : "bg-muted text-muted-foreground"
                                    )}
                                  >
                                    {txn.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile card view */}
                  <div className="md:hidden divide-y divide-border">
                    {isLoading ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="p-4 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                      ))
                    ) : filteredTransactions.length === 0 ? (
                      <div className="text-center text-sm text-muted-foreground py-12">
                        No transactions found for the selected filters.
                      </div>
                    ) : (
                      filteredTransactions.slice(0, 200).map(txn => {
                        const cfg = sourceConfig[txn.source as Exclude<IncomeSource, 'all'>];
                        const TxnIcon = cfg?.icon ?? DollarSign;
                        return (
                          <div key={`${txn.source}-${txn.id}`} className="p-3 space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <Badge variant="outline" className={cn("text-[10px] gap-1 border shrink-0", cfg?.badgeVariant)}>
                                <TxnIcon className="h-2.5 w-2.5" />
                                {cfg?.label?.split(' ')[0]}
                              </Badge>
                              <span className="text-sm font-medium tabular-nums">
                                {txn.currency}{txn.amount.toFixed(2)}
                              </span>
                            </div>
                            <p className="text-xs truncate">{txn.description}</p>
                            {txn.metadata && (
                              <p className="text-[10px] text-muted-foreground/60 truncate">{txn.metadata}</p>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-muted-foreground">
                                {format(new Date(txn.date), 'dd MMM yyyy HH:mm')}
                              </span>
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-[10px]",
                                  txn.status === 'active' || txn.status === 'paid' || txn.status === 'completed' || txn.status === 'fulfilled'
                                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                    : txn.status === 'cancelled' || txn.status === 'expired'
                                    ? "bg-red-500/10 text-red-500 border-red-500/20"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                {txn.status}
                              </Badge>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
