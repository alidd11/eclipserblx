import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, PiggyBank, Users, BarChart3, Percent, DollarSign, Target } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, subMonths, startOfDay, subDays, format, isAfter } from '@/lib/dateUtils';
import { RevolutDonutChart } from '@/components/ui/revolut-donut-chart';
import { RevolutAreaChart } from '@/components/ui/revolut-chart';
import { cn } from '@/lib/utils';
import { IncomeErrorState } from './IncomeErrorState';
import { formatGBP } from '@/lib/formatters';

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
 <div className="border border-border rounded-xl overflow-hidden relative overflow-hidden">
 <div className="p-4 pt-5 pb-4">
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
 </div>
 </div>
 );
}

export function FinancialOverview() {
 const queryDefaults = { staleTime: 60000, retry: 2 } as const;

 // Stripe balance
 const { data: stripeBalance, isLoading: stripeLoading, isError: stripeError, refetch: refetchStripe } = useQuery<StripeBalanceData>({
 queryKey: ['admin-stripe-balance'],
 queryFn: async () => {
 const { data, error } = await supabase.functions.invoke('get-stripe-balance');
 if (error) throw error;
 return data as StripeBalanceData;
 },
 ...queryDefaults,
 });

 // Orders for revenue
 const { data: ordersData, isLoading: ordersLoading, isError: ordersError, refetch: refetchOrders } = useQuery({
 queryKey: ['admin-financial-overview-orders'],
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


 // Seller Pro Subscriptions
 const { data: subsData, isLoading: subsLoading, isError: subsError, refetch: refetchSubs } = useQuery({
 queryKey: ['admin-financial-overview-seller-subs'],
 queryFn: async () => {
 const { data, error } = await supabase
 .from('seller_subscriptions')
 .select('status, created_at');
 if (error) throw error;
 return data ?? [];
 },
 ...queryDefaults,
 });

 // Commission data
 const { data: commissionData, isLoading: commLoading, isError: commError, refetch: refetchComm } = useQuery({
 queryKey: ['admin-financial-overview-commission'],
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

 // Credit purchases
 const { data: creditPurchases, isLoading: creditsLoading, isError: creditsError, refetch: refetchCredits } = useQuery({
 queryKey: ['admin-financial-overview-credits'],
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
 const { data: robuxData, isLoading: robuxLoading, isError: robuxError, refetch: refetchRobux } = useQuery({
 queryKey: ['admin-financial-overview-robux'],
 queryFn: async () => {
 const { data, error } = await supabase
 .from('robux_transactions')
 .select('robux_after_tax, created_at');
 if (error) throw error;
 return data ?? [];
 },
 ...queryDefaults,
 });

 const isLoading = stripeLoading || ordersLoading || subsLoading || commLoading || creditsLoading || robuxLoading;
 // Only show full error if ALL non-Stripe sources fail — Stripe is optional (edge function may be down)
 const coreErrors = [ordersError, subsError, commError, creditsError, robuxError];
 const hasError = coreErrors.every(Boolean);

 const handleRetryAll = () => {
 refetchStripe();
 refetchOrders();
 refetchSubs();
 refetchComm();
 refetchCredits();
 refetchRobux();
 };

 const metrics = useMemo(() => {
 const now = new Date();
 const thisMonth = startOfMonth(now);
 const lastMonth = startOfMonth(subMonths(now, 1));
 const thirtyDaysAgo = subDays(now, 30);
 const sixtyDaysAgo = subDays(now, 60);

 const safeDateParse = (dateStr: string | null | undefined): Date | null => {
 if (!dateStr) return null;
 const d = new Date(dateStr);
 return isNaN(d.getTime()) ? null : d;
 };

 // Total all-time gross revenue from orders
 const allTimeGross = (ordersData ?? []).reduce((s, o) => s + (Number(o.total) || 0), 0);

 // This month revenue
 const thisMonthRevenue = (ordersData ?? [])
 .filter(o => { const d = safeDateParse(o.created_at); return d && isAfter(d, thisMonth); })
 .reduce((s, o) => s + (Number(o.total) || 0), 0);
 const lastMonthRevenue = (ordersData ?? [])
 .filter(o => {
 const d = safeDateParse(o.created_at);
 return d && isAfter(d, lastMonth) && !isAfter(d, thisMonth);
 })
 .reduce((s, o) => s + (Number(o.total) || 0), 0);
 const monthOverMonth = lastMonthRevenue > 0
 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
 : 0;

 // Commission (platform take)
 const totalCommission = (commissionData ?? []).reduce((s, c) => s + (Number(c.platform_fee) || 0), 0);
 const thisMonthCommission = (commissionData ?? [])
 .filter(c => { const d = safeDateParse(c.created_at); return d && isAfter(d, thisMonth); })
 .reduce((s, c) => s + (Number(c.platform_fee) || 0), 0);

 // Total stripe fees from seller transactions
 const totalStripeFees = (commissionData ?? []).reduce((s, c) => s + (Number((c as any).stripe_fee) || 0), 0);


 // Seller Pro MRR (£7.99/mo per active sub)
 const activeSubs = (subsData ?? []).filter(s => s.status === 'active');
 const mrr = activeSubs.length * 7.99;

 // Credits
 const totalCredits = (creditPurchases ?? []).reduce((s, c) => s + (Number(c.amount) || 0), 0);

 // Robux in GBP
 const totalRobuxGBP = (robuxData ?? []).reduce(
 (s, r) => s + (Number(r.robux_after_tax) || 0) * ROBUX_TO_GBP_RATE,
 0
 );

 // Stripe actual balance
 const stripeAvailable = stripeBalance?.balance?.available ?? 0;
 const stripePending = stripeBalance?.balance?.pending ?? 0;
 const stripeFees30d = stripeBalance?.summary?.last30Days?.fees ?? 0;
 const stripeRefunds30d = stripeBalance?.summary?.last30Days?.refunds ?? 0;

 // Net profit this month = thisMonthRevenue + thisMonthCommission + thisMonthAdRevenue - estimated fees
 const totalRevenueThisMonth = thisMonthRevenue + thisMonthCommission + thisMonthAdRevenue;
 // Estimate profit margin from stripe data
 const profitMargin = totalRevenueThisMonth > 0
 ? ((totalRevenueThisMonth - stripeFees30d - stripeRefunds30d) / totalRevenueThisMonth) * 100
 : 0;

 // Average revenue per order
 const orderCount = (ordersData ?? []).length;
 const avgOrderValue = orderCount > 0 ? allTimeGross / orderCount : 0;

 // Revenue composition for donut
 const composition = [
 { name: 'Product Sales', value: Math.round(allTimeGross) },
 { name: 'Commission', value: Math.round(totalCommission) },
 { name: 'Advertising', value: Math.round(totalAdRevenue) },
 { name: 'Subscriptions', value: Math.round(mrr * 12) },
 { name: 'Credits', value: Math.round(totalCredits) },
 { name: 'Robux (est.)', value: Math.round(totalRobuxGBP) },
 ].filter(c => c.value > 0);

 // 30-day revenue trend (daily)
 const dailyRevenue: Record<string, number> = {};
 for (let i = 29; i >= 0; i--) {
 dailyRevenue[format(subDays(now, i), 'yyyy-MM-dd')] = 0;
 }
 (ordersData ?? []).forEach(o => {
 const d = safeDateParse(o.created_at);
 if (!d) return;
 const key = format(d, 'yyyy-MM-dd');
 if (dailyRevenue[key] !== undefined) dailyRevenue[key] += Number(o.total) || 0;
 });
 const trendData = Object.entries(dailyRevenue).map(([date, revenue]) => ({
 date,
 displayDate: format(new Date(date), 'MMM d'),
 revenue,
 }));

 // 30-day vs prev 30-day total
 const last30 = (ordersData ?? [])
 .filter(o => { const d = safeDateParse(o.created_at); return d && isAfter(d, thirtyDaysAgo); })
 .reduce((s, o) => s + (Number(o.total) || 0), 0);
 const prev30 = (ordersData ?? [])
 .filter(o => {
 const d = safeDateParse(o.created_at);
 return d && isAfter(d, sixtyDaysAgo) && !isAfter(d, thirtyDaysAgo);
 })
 .reduce((s, o) => s + (Number(o.total) || 0), 0);
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
 profitMargin,
 avgOrderValue,
 orderCount,
 stripeFees30d,
 stripeRefunds30d,
 };
 }, [ordersData, commissionData, adRevenue, subsData, creditPurchases, robuxData, stripeBalance]);

 if (hasError && !isLoading) {
 return (
 <IncomeErrorState
 title="Failed to load financial overview"
 message="One or more data sources could not be loaded. Please try again."
 onRetry={handleRetryAll}
 />
 );
 }

 return (
 <div className="space-y-6">
 {/* Top-level KPI row */}
 <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
 <MetricCard
 label="Stripe Available"
 value={`{formatGBP((metrics.stripeAvailable))}`}
 subtitle="Ready to withdraw"
 icon={Wallet}
 accentClass="text-emerald-500"
 isLoading={isLoading}
 />
 <MetricCard
 label="This Month Revenue"
 value={`{formatGBP(metrics.thisMonthRevenue)}`}
 trend={metrics.monthOverMonth !== 0 ? { value: metrics.monthOverMonth, label: 'vs last month' } : undefined}
 subtitle="Gross product sales"
 icon={TrendingUp}
 accentClass="text-primary"
 isLoading={isLoading}
 />
 <MetricCard
 label="Seller Pro MRR"
 value={`{formatGBP(metrics.mrr)}`}
 subtitle={`${metrics.activeSubs} Pro sellers`}
 icon={PiggyBank}
 accentClass="text-amber-500"
 isLoading={isLoading}
 />
 <MetricCard
 label="Platform Commission"
 value={`{formatGBP(metrics.thisMonthCommission)}`}
 subtitle={`{formatGBP(metrics.totalCommission)} all time`}
 icon={Percent}
 accentClass="text-blue-500"
 isLoading={isLoading}
 />
 <MetricCard
 label="Avg Order Value"
 value={`{formatGBP(metrics.avgOrderValue)}`}
 subtitle={`${metrics.orderCount} orders total`}
 icon={Target}
 accentClass="text-cyan-500"
 isLoading={isLoading}
 />
 <MetricCard
 label="Profit Margin (30d)"
 value={`${metrics.profitMargin.toFixed(1)}%`}
 subtitle={`{formatGBP(metrics.stripeFees30d)} fees, {formatGBP(metrics.stripeRefunds30d)} refunds`}
 icon={DollarSign}
 accentClass={metrics.profitMargin >= 70 ? 'text-emerald-500' : metrics.profitMargin >= 50 ? 'text-amber-500' : 'text-red-500'}
 isLoading={isLoading}
 />
 </div>

 {/* Revenue trend + composition donut */}
 <div className="grid gap-4 lg:grid-cols-[1fr,320px]">
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30 pb-2">
 <div className="flex items-center justify-between">
 <h3 className="font-semibold text-sm text-base flex items-center gap-2">
 <BarChart3 className="h-4 w-4 text-primary" />
 30-Day Revenue Trend
 </h3>
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
 </div>
 <div className="p-4">
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
 </div>
 </div>

 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30 pb-2">
 <h3 className="font-semibold text-sm text-base">Revenue Composition</h3>
 </div>
 <div className="p-4 flex flex-col items-center">
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
 </div>
 </div>
 </div>
 </div>
 );
}
