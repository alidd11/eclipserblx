/**
 * Stripe/Shopify-inspired single-page revenue dashboard.
 * No tabs — one scrollable page with clear sections.
 */
import { useMemo, lazy, Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
 TrendingUp, Wallet, ArrowUpRight, ArrowDownRight,
 BarChart3, Percent, DollarSign, RefreshCw,
 Coins, Gamepad2, Store, ChevronDown, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, subMonths, subDays, format, isAfter, startOfDay } from '@/lib/dateUtils';
import { RevolutAreaChart, RevolutLineChart } from '@/components/ui/revolut-chart';
import { RevolutDonutChart } from '@/components/ui/revolut-donut-chart';
import { IncomeErrorState } from './IncomeErrorState';
import { cn } from '@/lib/utils';

const AdminIncomeSources = lazy(() => import('@/pages/admin/IncomeSources').then(m => ({ default: m.default })));

const ROBUX_TO_GBP_RATE = 0.00275;

/* ── Period selector ── */
const periods = [
 { key: '7d', label: '7D', days: 7 },
 { key: '30d', label: '30D', days: 30 },
 { key: '90d', label: '90D', days: 90 },
] as const;

/* ── Collapsible section ── */
function Section({ title, icon: Icon, children, defaultOpen = false }: {
 title: string; icon: typeof Coins; children: React.ReactNode; defaultOpen?: boolean;
}) {
 const [open, setOpen] = useState(defaultOpen);
 return (
 <div>
 <button
 onClick={() => setOpen(!open)}
 className="flex items-center gap-2 w-full text-left group py-1"
 >
 <Icon className="h-4 w-4 text-muted-foreground" />
 <span className="text-sm font-semibold text-foreground">{title}</span>
 <ChevronDown className={cn(
 'h-3.5 w-3.5 text-muted-foreground transition-transform ml-auto',
 !open && '-rotate-90'
 )} />
 </button>
 {open && <div className="mt-3">{children}</div>}
 </div>
 );
}

/* ── KPI Card ── */
function KPICard({ label, value, subtitle, trend, isLoading }: {
 label: string; value: string; subtitle?: string;
 trend?: { value: number; label: string }; isLoading?: boolean;
}) {
 return (
 <div className="space-y-1">
 <p className="text-xs text-muted-foreground font-medium">{label}</p>
 {isLoading ? (
 <Skeleton className="h-7 w-24" />
 ) : (
 <div className="flex items-baseline gap-2">
 <span className="text-xl font-bold tracking-tight text-foreground">{value}</span>
 {trend && (
 <span className={cn(
 'inline-flex items-center gap-0.5 text-[11px] font-medium',
 trend.value >= 0 ? 'text-emerald-500' : 'text-red-500'
 )}>
 {trend.value >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
 {Math.abs(trend.value).toFixed(0)}%
 </span>
 )}
 </div>
 )}
 {subtitle && !isLoading && (
 <p className="text-[11px] text-muted-foreground">{subtitle}</p>
 )}
 </div>
 );
}

/* ── Main Dashboard ── */
export function RevenueDashboard() {
 const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
 const selectedPeriod = periods.find(p => p.key === period)!;
 const queryDefaults = { staleTime: 60000, retry: 2 } as const;

 // Stripe balance (live)
 const { data: stripeBalance, isLoading: stripeLoading, refetch: refetchStripe } = useQuery<{
 balance: { available: number; pending: number; currency: string };
 summary: { last30Days: { gross: number; fees: number; net: number; refunds?: number; refundCount?: number }; avgFeePercent: string };
 dailyTrend: Array<{ date: string; gross: number; fees: number; net: number; count: number }>;
 }>({
 queryKey: ['admin-stripe-balance'],
 queryFn: async () => {
 const { data, error } = await supabase.functions.invoke('get-stripe-balance');
 if (error) throw error;
 return data;
 },
 ...queryDefaults,
 });

 // Orders
 const { data: ordersData, isLoading: ordersLoading, refetch: refetchOrders } = useQuery({
 queryKey: ['admin-revenue-orders'],
 queryFn: async () => {
 const { data, error } = await supabase
 .from('orders')
 .select('total, created_at')
 .in('status', ['paid', 'fulfilled', 'completed']);
 if (error) throw error;
 return data ?? [];
 },
 ...queryDefaults,
 });

 // Ad revenue
 const { data: adRevenue, isLoading: adsLoading } = useQuery({
 queryKey: ['admin-revenue-ads'],
 queryFn: async () => {
 const { data, error } = await supabase
 .from('discord_advertisements')
 .select('price_paid, ping_price_paid, posted_at')
 .not('posted_at', 'is', null);
 if (error) throw error;
 return data ?? [];
 },
 ...queryDefaults,
 });

 // Seller Pro Subscriptions
 const { data: subsData, isLoading: subsLoading } = useQuery({
 queryKey: ['admin-revenue-seller-subs'],
 queryFn: async () => {
 const { data, error } = await supabase
 .from('seller_subscriptions')
 .select('status, created_at');
 if (error) throw error;
 return data ?? [];
 },
 ...queryDefaults,
 });

 // Commission
 const { data: commissionData, isLoading: commLoading } = useQuery({
 queryKey: ['admin-revenue-commission'],
 queryFn: async () => {
 const { data, error } = await supabase
 .from('seller_transactions')
 .select('platform_fee, stripe_fee, created_at')
 .eq('type', 'sale')
 .is('refunded_at', null);
 if (error) throw error;
 return data ?? [];
 },
 ...queryDefaults,
 });

 // Credits
 const { data: creditPurchases, isLoading: creditsLoading } = useQuery({
 queryKey: ['admin-revenue-credits'],
 queryFn: async () => {
 const { data, error } = await supabase
 .from('credit_transactions')
 .select('amount, created_at')
 .eq('type', 'purchase');
 if (error) throw error;
 return data ?? [];
 },
 ...queryDefaults,
 });

 // Robux
 const { data: robuxData, isLoading: robuxLoading } = useQuery({
 queryKey: ['admin-revenue-robux'],
 queryFn: async () => {
 const { data, error } = await supabase
 .from('robux_transactions')
 .select('robux_after_tax, created_at');
 if (error) throw error;
 return data ?? [];
 },
 ...queryDefaults,
 });

 const isLoading = stripeLoading || ordersLoading || adsLoading || subsLoading || commLoading || creditsLoading || robuxLoading;

 const handleRefresh = () => {
 refetchStripe();
 refetchOrders();
 };

 // ── Computed metrics ──
 const metrics = useMemo(() => {
 const now = new Date();
 const thisMonth = startOfMonth(now);
 const lastMonth = startOfMonth(subMonths(now, 1));
 const periodStart = subDays(now, selectedPeriod.days);
 const prevPeriodStart = subDays(now, selectedPeriod.days * 2);

 const safeParse = (d: string | null) => {
 if (!d) return null;
 const date = new Date(d);
 return isNaN(date.getTime()) ? null : date;
 };

 // Gross revenue
 const allTimeGross = (ordersData ?? []).reduce((s, o) => s + (Number(o.total) || 0), 0);
 const periodGross = (ordersData ?? [])
 .filter(o => { const d = safeParse(o.created_at); return d && isAfter(d, periodStart); })
 .reduce((s, o) => s + (Number(o.total) || 0), 0);
 const prevPeriodGross = (ordersData ?? [])
 .filter(o => { const d = safeParse(o.created_at); return d && isAfter(d, prevPeriodStart) && !isAfter(d, periodStart); })
 .reduce((s, o) => s + (Number(o.total) || 0), 0);
 const grossTrend = prevPeriodGross > 0 ? ((periodGross - prevPeriodGross) / prevPeriodGross) * 100 : 0;

 // Orders count
 const periodOrders = (ordersData ?? []).filter(o => { const d = safeParse(o.created_at); return d && isAfter(d, periodStart); }).length;

 // Commission
 const totalCommission = (commissionData ?? []).reduce((s, c) => s + (Number(c.platform_fee) || 0), 0);
 const periodCommission = (commissionData ?? [])
 .filter(c => { const d = safeParse(c.created_at); return d && isAfter(d, periodStart); })
 .reduce((s, c) => s + (Number(c.platform_fee) || 0), 0);

 // Ad revenue
 const totalAdRevenue = (adRevenue ?? []).reduce(
 (s, a) => s + (Number(a.price_paid) || 0) + (Number(a.ping_price_paid) || 0), 0
 );

 // Seller Pro MRR (£7.99/mo per active sub)
 const activeSubs = (subsData ?? []).filter(s => s.status === 'active');
 const mrr = activeSubs.length * 7.99;

 // Credits & Robux
 const totalCredits = (creditPurchases ?? []).reduce((s, c) => s + (Number(c.amount) || 0), 0);
 const totalRobuxGBP = (robuxData ?? []).reduce(
 (s, r) => s + (Number(r.robux_after_tax) || 0) * ROBUX_TO_GBP_RATE, 0
 );

 // Stripe
 const stripeAvailable = stripeBalance?.balance?.available ?? 0;
 const stripePending = stripeBalance?.balance?.pending ?? 0;
 const stripeFees = stripeBalance?.summary?.last30Days?.fees ?? 0;

 // Revenue trend chart data
 const dailyRevenue: Record<string, number> = {};
 for (let i = selectedPeriod.days - 1; i >= 0; i--) {
 dailyRevenue[format(subDays(now, i), 'yyyy-MM-dd')] = 0;
 }
 (ordersData ?? []).forEach(o => {
 const d = safeParse(o.created_at);
 if (!d) return;
 const key = format(d, 'yyyy-MM-dd');
 if (dailyRevenue[key] !== undefined) dailyRevenue[key] += Number(o.total) || 0;
 });
 const trendData = Object.entries(dailyRevenue).map(([date, revenue]) => ({
 date,
 displayDate: format(new Date(date), 'MMM d'),
 revenue,
 }));

 // Composition
 const composition = [
 { name: 'Product Sales', value: Math.round(allTimeGross) },
 { name: 'Commission', value: Math.round(totalCommission) },
 { name: 'Advertising', value: Math.round(totalAdRevenue) },
 { name: 'Subscriptions', value: Math.round(mrr * 12) },
 { name: 'Credits', value: Math.round(totalCredits) },
 { name: 'Robux (est.)', value: Math.round(totalRobuxGBP) },
 ].filter(c => c.value > 0);

 return {
 stripeAvailable, stripePending, stripeFees,
 periodGross, grossTrend, periodOrders,
 periodCommission, totalCommission,
 mrr, activeSubs: activeSubs.length,
 allTimeGross, totalAdRevenue, totalCredits, totalRobuxGBP,
 trendData, composition,
 };
 }, [ordersData, commissionData, adRevenue, subsData, creditPurchases, robuxData, stripeBalance, selectedPeriod]);

 const COMPOSITION_COLORS = [
 'hsl(262 100% 71%)', 'hsl(220 95% 59%)', 'hsl(185 85% 50%)',
 'hsl(45 93% 58%)', 'hsl(330 80% 60%)', 'hsl(130 60% 50%)',
 ];

 return (
 <div className="space-y-6 w-full">
 {/* ── Header ── */}
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
 <div>
 <h1 className="text-2xl font-display font-bold text-foreground">Revenue</h1>
 <p className="text-sm text-muted-foreground mt-0.5">Financial performance & earnings</p>
 </div>
 <div className="flex items-center gap-2">
 <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading} className="gap-1.5 h-8">
 <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
 Refresh
 </Button>
 </div>
 </div>

 {/* ── Period selector + KPIs ── */}
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="p-4 pt-5 pb-5">
 {/* Period pills */}
 <div className="flex items-center gap-1 mb-5">
 {periods.map(p => (
 <button
 key={p.key}
 onClick={() => setPeriod(p.key as any)}
 className={cn(
 'px-3 py-1 rounded-full text-xs font-medium transition-colors',
 period === p.key
 ? 'bg-primary text-primary-foreground'
 : 'bg-muted text-muted-foreground hover:text-foreground'
 )}
 >
 {p.label}
 </button>
 ))}
 <Badge variant="outline" className="ml-auto text-[10px] text-muted-foreground">
 Live
 </Badge>
 </div>

 {/* KPI row */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
 <KPICard
 label="Gross Volume"
 value={`£${metrics.periodGross.toFixed(2)}`}
 trend={metrics.grossTrend !== 0 ? { value: metrics.grossTrend, label: 'vs prev' } : undefined}
 subtitle={`${metrics.periodOrders} orders`}
 isLoading={isLoading}
 />
 <KPICard
 label="Stripe Balance"
 value={`£${metrics.stripeAvailable.toFixed(2)}`}
 subtitle={`£${metrics.stripePending.toFixed(2)} pending`}
 isLoading={isLoading}
 />
 <KPICard
 label="Commission"
 value={`£${metrics.periodCommission.toFixed(2)}`}
 subtitle={`£${metrics.totalCommission.toFixed(2)} all time`}
 isLoading={isLoading}
 />
 <KPICard
 label="Subscription MRR"
 value={`£${metrics.mrr.toFixed(2)}`}
 subtitle={`${metrics.activeSubs} subscribers`}
 isLoading={isLoading}
 />
 </div>
 </div>
 </div>

 {/* ── Stripe Balance Summary ── */}
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="p-4 pt-5 pb-5">
 <div className="flex items-center gap-2 mb-4">
 <Wallet className="h-4 w-4 text-muted-foreground" />
 <span className="text-sm font-semibold">Stripe Balance</span>
 <Badge variant="default" className="bg-emerald-600 ml-auto text-[10px]">Live</Badge>
 </div>
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
 <KPICard label="Available" value={`£${metrics.stripeAvailable.toFixed(2)}`} subtitle="Ready to pay out" isLoading={stripeLoading} />
 <KPICard label="Pending" value={`£${metrics.stripePending.toFixed(2)}`} subtitle="In transit" isLoading={stripeLoading} />
 <KPICard label="30d Fees" value={`£${metrics.stripeFees.toFixed(2)}`} subtitle={`${stripeBalance?.summary?.avgFeePercent ?? '0'}% avg rate`} isLoading={stripeLoading} />
 <KPICard label="30d Refunds" value={`£${(stripeBalance?.summary?.last30Days?.refunds ?? 0).toFixed(2)}`} subtitle={`${stripeBalance?.summary?.last30Days?.refundCount ?? 0} refunds`} isLoading={stripeLoading} />
 </div>
 </div>
 </div>

 {/* ── Earnings Breakdown ── */}
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="p-4 pt-5 pb-5 space-y-5">
 <div className="flex items-center gap-2">
 <BarChart3 className="h-4 w-4 text-muted-foreground" />
 <span className="text-sm font-semibold">Earnings Breakdown</span>
 </div>

 <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
 <KPICard label="All-Time Gross" value={`£${metrics.allTimeGross.toFixed(2)}`} isLoading={isLoading} />
 <KPICard label="Ad Revenue" value={`£${metrics.totalAdRevenue.toFixed(2)}`} isLoading={isLoading} />
 <KPICard label="Credits" value={`£${metrics.totalCredits.toFixed(2)}`} isLoading={isLoading} />
 <KPICard label="Robux (est.)" value={`£${metrics.totalRobuxGBP.toFixed(2)}`} isLoading={isLoading} />
 </div>
 </div>
 </div>

 {/* ── Hero Chart ── */}
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30 pb-2">
 <div className="flex items-center justify-between">
 <h3 className="font-semibold text-sm text-base">Revenue Trend</h3>
 {!isLoading && (
 <span className={cn(
 'text-xs font-medium flex items-center gap-0.5',
 metrics.grossTrend >= 0 ? 'text-emerald-500' : 'text-red-500'
 )}>
 {metrics.grossTrend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
 {Math.abs(metrics.grossTrend).toFixed(0)}% vs previous {selectedPeriod.days}d
 </span>
 )}
 </div>
 </div>
 <div className="p-4">
 {isLoading ? (
 <Skeleton className="h-[220px] w-full" />
 ) : (
 <RevolutAreaChart
 data={metrics.trendData}
 xKey="displayDate"
 series={[{ dataKey: 'revenue', color: 'hsl(262 100% 71%)', name: 'Revenue' }]}
 height={220}
 yFormatter={(v) => `£${v}`}
 />
 )}
 </div>
 </div>

 {/* ── Two-column: Stripe actual + Composition ── */}
 <div className="grid gap-4 lg:grid-cols-[1fr,300px]">
 {/* Stripe 30-day actual */}
 {stripeBalance?.dailyTrend && (
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30 pb-2">
 <h3 className="font-semibold text-sm text-base">Stripe Net Revenue (30d)</h3>
 <p className="text-sm text-muted-foreground">Actual gross vs net after fees</p>
 </div>
 <div className="p-4">
 {stripeLoading ? (
 <Skeleton className="h-[200px] w-full" />
 ) : (
 <RevolutLineChart
 data={(stripeBalance.dailyTrend ?? []).map(d => ({
 ...d, displayDate: format(new Date(d.date), 'MMM d'),
 }))}
 xKey="displayDate"
 series={[
 { dataKey: 'gross', color: 'hsl(262 100% 71%)', name: 'Gross' },
 { dataKey: 'net', color: 'hsl(160 70% 50%)', name: 'Net' },
 ]}
 height={200}
 yFormatter={(v) => `£${v}`}
 tooltipContent={({ active, payload }: { active?: boolean; payload?: { payload: Record<string, number | string> }[] }) => {
 if (!active || !payload?.length) return null;
 const d = payload[0].payload;
 return (
 <div className="bg-popover border rounded-lg p-2.5 shadow-lg text-xs">
 <p className="font-medium mb-1.5">{d.displayDate}</p>
 <div className="space-y-0.5">
 <div className="flex justify-between gap-3">
 <span className="text-muted-foreground">Gross</span>
 <span>£{(Number(d.gross) || 0).toFixed(2)}</span>
 </div>
 <div className="flex justify-between gap-3">
 <span className="text-muted-foreground">Fees</span>
 <span className="text-destructive">-£{(Number(d.fees) || 0).toFixed(2)}</span>
 </div>
 <div className="flex justify-between gap-3 border-t pt-1">
 <span className="font-medium">Net</span>
 <span className="text-emerald-500 font-medium">£{(Number(d.net) || 0).toFixed(2)}</span>
 </div>
 </div>
 </div>
 );
 }}
 />
 )}
 </div>
 </div>
 )}

 {/* Composition donut */}
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30 pb-2">
 <h3 className="font-semibold text-sm text-base">Revenue Mix</h3>
 </div>
 <div className="p-4 flex flex-col items-center">
 {isLoading ? (
 <Skeleton className="h-[160px] w-[160px] rounded-full" />
 ) : metrics.composition.length === 0 ? (
 <p className="text-sm text-muted-foreground py-8">No data yet</p>
 ) : (
 <>
 <RevolutDonutChart
 data={metrics.composition}
 height={160}
 innerRadius={50}
 outerRadius={72}
 />
 <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-4 w-full">
 {metrics.composition.map((item, i) => (
 <div key={item.name} className="flex items-center gap-1.5 text-[11px]">
 <div
 className="h-2 w-2 rounded-full shrink-0"
 style={{ backgroundColor: COMPOSITION_COLORS[i % 6] }}
 />
 <span className="text-muted-foreground truncate">{item.name}</span>
 <span className="font-medium ml-auto">£{item.value}</span>
 </div>
 ))}
 </div>
 </>
 )}
 </div>
 </div>
 </div>

 {/* ── Income Sources ── */}
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="p-4 pt-5 pb-5">
 <Section title="Income Sources" icon={DollarSign} defaultOpen={false}>
 <Suspense fallback={<Skeleton className="h-64 w-full" />}>
 <AdminIncomeSources />
 </Suspense>
 </Section>
 </div>
 </div>
 </div>
 );
}
