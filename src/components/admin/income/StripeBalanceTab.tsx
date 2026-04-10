import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wallet, Clock, TrendingUp, Percent, RefreshCw, CheckCircle2 } from 'lucide-react';
import { IncomeErrorState } from './IncomeErrorState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { supabase } from '@/integrations/supabase/client';
import { format } from '@/lib/dateUtils';
import { RevolutLineChart } from '@/components/ui/revolut-chart';
import { formatGBP } from '@/lib/formatters';

interface StripeBalanceData {
 balance: { available: number; pending: number; currency: string };
 summary: {
 today: { gross: number; fees: number; net: number; refunds?: number; refundCount?: number };
 last7Days: { gross: number; fees: number; net: number; refunds?: number; refundCount?: number };
 last30Days: { gross: number; fees: number; net: number; refunds?: number; refundCount?: number };
 avgFeePercent: string;
 };
 dailyTrend: Array<{ date: string; gross: number; fees: number; net: number; count: number; refunds?: number; refundCount?: number }>;
 transactionCount: number;
 refundCount?: number;
}

export function StripeBalanceTab() {
 const { data: stripeBalance, isLoading, isError, error, refetch } = useQuery<StripeBalanceData>({
 queryKey: ['admin-stripe-balance'],
 queryFn: async () => {
 const { data, error } = await supabase.functions.invoke('get-stripe-balance');
 if (error) throw error;
 return data as StripeBalanceData;
 },
 staleTime: 60000,
 retry: 2,
 });

 const chartData = useMemo(() => {
 if (!stripeBalance?.dailyTrend) return [];
 return stripeBalance.dailyTrend.map(day => ({
 ...day,
 displayDate: format(new Date(day.date), 'MMM d'),
 }));
 }, [stripeBalance]);

 const periods = [
 { label: 'Today', data: stripeBalance?.summary.today },
 { label: 'Last 7 Days', data: stripeBalance?.summary.last7Days },
 { label: 'Last 30 Days', data: stripeBalance?.summary.last30Days },
 ];

 if (isError) {
 return <IncomeErrorState title="Failed to load Stripe data" message={error?.message || 'Could not connect to the payment processor.'} onRetry={() => refetch()} />;
 }

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Badge variant="default" className="bg-green-600">Live Data</Badge>
 <span className="text-sm text-muted-foreground">Real-time data from payment processor</span>
 </div>
 <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading} className="gap-2">
 <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
 Refresh
 </Button>
 </div>

 {/* Summary Cards */}
 <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
 {isLoading ? (
 Array.from({ length: 5 }).map((_, i) => (
 <div key={i} className="p-4"><Skeleton className="h-16 w-full" /></div>
 ))
 ) : (
 <>
 <AdminStatCard
 label="Available Balance"
 value={`{formatGBP((stripeBalance?.balance.available ?? 0))}`}
 valueColor="green"
 subtitle="Ready to pay out"
 />
 <AdminStatCard
 label="Pending Balance"
 value={`{formatGBP((stripeBalance?.balance.pending ?? 0))}`}
 valueColor="yellow"
 subtitle="In transit"
 />
 <AdminStatCard
 label="30-Day Net"
 value={`{formatGBP((stripeBalance?.summary.last30Days.net ?? 0))}`}
 valueColor="blue"
 subtitle="After fees"
 />
 <AdminStatCard
 label="Avg Fee Rate"
 value={`${stripeBalance?.summary.avgFeePercent ?? '0'}%`}
 valueColor="destructive"
 subtitle="Actual fees paid"
 />
 <AdminStatCard
 label="30-Day Refunds"
 value={`{formatGBP((stripeBalance?.summary.last30Days.refunds ?? 0))}`}
 valueColor="orange"
 subtitle={`${stripeBalance?.summary.last30Days.refundCount ?? 0} refund${(stripeBalance?.summary.last30Days.refundCount ?? 0) !== 1 ? 's' : ''}`}
 />
 </>
 )}
 </div>

 {/* Period Breakdown */}
 <div className="grid gap-4 lg:grid-cols-3">
 {periods.map(({ label, data }) => (
 <div className="border border-border rounded-xl overflow-hidden" key={label}>
 <div className="px-4 py-3 border-b border-border bg-muted/30 pb-2">
 <h3 className="font-semibold text-sm text-lg">{label}</h3>
 </div>
 <div className="p-4 space-y-2">
 {isLoading ? (
 <div className="space-y-2">
 <Skeleton className="h-5 w-full" />
 <Skeleton className="h-5 w-full" />
 <Skeleton className="h-5 w-full" />
 </div>
 ) : (
 <>
 <div className="flex justify-between">
 <span className="text-muted-foreground">Gross</span>
 <span className="font-medium">£{(data?.gross ?? 0).toFixed(2)}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-muted-foreground">Fees</span>
 <span className="font-medium text-destructive">-£{(data?.fees ?? 0).toFixed(2)}</span>
 </div>
 {(data?.refunds ?? 0) > 0 && (
 <div className="flex justify-between">
 <span className="text-muted-foreground">Refunds ({data?.refundCount})</span>
 <span className="font-medium text-orange-500">-£{(data?.refunds ?? 0).toFixed(2)}</span>
 </div>
 )}
 <div className="flex justify-between border-t pt-2">
 <span className="font-medium">Net</span>
 <span className="font-bold text-green-600">£{(data?.net ?? 0).toFixed(2)}</span>
 </div>
 </>
 )}
 </div>
 </div>
 ))}
 </div>

 {/* Chart */}
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <h3 className="font-semibold text-sm">30-Day Revenue Trend (Actual)</h3>
 <p className="text-sm text-muted-foreground">Daily gross vs net earnings with actual fees</p>
 </div>
 <div className="p-4">
 {isLoading ? (
 <Skeleton className="h-[300px] w-full" />
 ) : (
 <RevolutLineChart
 data={chartData}
 xKey="displayDate"
 series={[
 { dataKey: 'gross', color: 'hsl(262 100% 71%)', name: 'Gross Revenue' },
 { dataKey: 'net', color: 'hsl(220 95% 59%)', name: 'Net Revenue' },
 ]}
 height={300}
 yFormatter={(v) => `£${v}`}
 tooltipContent={({ active, payload }: { active?: boolean; payload?: { payload: Record<string, number | string> }[] }) => {
 if (!active || !payload?.length) return null;
 const data = payload[0].payload;
 return (
 <div className="bg-popover border rounded-lg p-3 shadow-lg">
 <p className="font-medium mb-2">{data.displayDate}</p>
 <div className="space-y-1 text-sm">
 <div className="flex justify-between gap-4">
 <span className="text-muted-foreground">Gross:</span>
 <span>£{(Number(data.gross) || 0).toFixed(2)}</span>
 </div>
 <div className="flex justify-between gap-4">
 <span className="text-muted-foreground">Fees:</span>
 <span className="text-destructive">-£{(Number(data.fees) || 0).toFixed(2)}</span>
 </div>
 <div className="flex justify-between gap-4 border-t pt-1">
 <span className="font-medium">Net:</span>
 <span className="text-green-600 font-medium">£{(Number(data.net) || 0).toFixed(2)}</span>
 </div>
 <div className="flex justify-between gap-4 text-xs text-muted-foreground">
 <span>Transactions:</span>
 <span>{data.count ?? 0}</span>
 </div>
 </div>
 </div>
 );
 }}
 />
 )}
 </div>
 </div>

 {/* Info */}
 <div className="border border-border rounded-xl overflow-hidden bg-blue-500/5 border-blue-500/20">
 <div className="p-4 pt-6">
 <div className="flex items-start gap-3">
 <CheckCircle2 className="h-5 w-5 text-blue-500 mt-0.5" />
 <div>
 <p className="font-medium">Accurate Fee Tracking</p>
 <p className="text-sm text-muted-foreground">
 This tab shows <strong>actual fees</strong> charged for each transaction,
 including international card surcharges, currency conversion fees, and any other applicable charges.
 </p>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}
