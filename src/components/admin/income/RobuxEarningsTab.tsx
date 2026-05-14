import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Gamepad2, Calendar, TrendingUp, Package, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { IncomeErrorState } from './IncomeErrorState';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, startOfWeek, startOfMonth, startOfYear, isAfter, subDays, format } from '@/lib/dateUtils';
import { RevolutLineChart } from '@/components/ui/revolut-chart';
import { formatGBP } from '@/lib/formatters';

const ROBUX_TO_GBP_RATE = 0.00275;

export function RobuxEarningsTab() {
 const { data: robuxTransactions, isLoading: robuxLoading, isError: robuxError, refetch: refetchRobux } = useQuery({
 queryKey: ['admin-robux-transactions'],
 queryFn: async () => {
 const { data, error } = await supabase
 .from('robux_transactions')
 .select('*')
 .order('created_at', { ascending: false })
 .limit(100);
 if (error) throw error;
 return data ?? [];
 },
 staleTime: 60000,
 retry: 2,
 });

 const { data: productsWithRobuxStatus, isLoading: productsLoading } = useQuery({
 queryKey: ['admin-products-robux-status'],
 queryFn: async () => {
 const { data, error } = await supabase
 .from('products')
 .select('id, name, slug, price, robux_enabled, robux_product_id, robux_price, is_active, category_id')
 .eq('is_active', true)
 .order('name');
 if (error) throw error;

 const { data: categories } = await supabase.from('categories').select('id, slug');
 const botCategoryId = categories?.find(c => c.slug === 'bots')?.id;
 const eligible = (data ?? []).filter(p => p.category_id !== botCategoryId);

 return {
 configured: eligible.filter(p => p.robux_enabled && p.robux_product_id),
 notConfigured: eligible.filter(p => !p.robux_enabled || !p.robux_product_id),
 total: eligible.length,
 };
 },
 });

 const breakdown = useMemo(() => {
 if (!robuxTransactions) return null;
 const now = new Date();
 const calc = (fn: (tx: NonNullable<typeof robuxTransactions>[number]) => boolean) => {
 const filtered = robuxTransactions.filter(fn);
 const net = filtered.reduce((s, t) => s + (t.robux_after_tax || 0), 0);
 return { net, count: filtered.length, gbp: net * ROBUX_TO_GBP_RATE };
 };
 return {
 daily: calc(t => isAfter(new Date(t.created_at), startOfDay(now))),
 weekly: calc(t => isAfter(new Date(t.created_at), startOfWeek(now, { weekStartsOn: 1 }))),
 monthly: calc(t => isAfter(new Date(t.created_at), startOfMonth(now))),
 yearly: calc(t => isAfter(new Date(t.created_at), startOfYear(now))),
 allTime: calc(() => true),
 };
 }, [robuxTransactions]);

 const trendData = useMemo(() => {
 if (!robuxTransactions) return [];
 const daily: Record<string, { net: number; count: number }> = {};
 for (let i = 29; i >= 0; i--) daily[format(subDays(new Date(), i), 'yyyy-MM-dd')] = { net: 0, count: 0 };
 robuxTransactions.forEach(tx => {
 const d = format(new Date(tx.created_at), 'yyyy-MM-dd');
 if (daily[d]) { daily[d].net += tx.robux_after_tax || 0; daily[d].count++; }
 });
 return Object.entries(daily).map(([date, v]) => ({
 date, displayDate: format(new Date(date), 'MMM d'), ...v,
 }));
 }, [robuxTransactions]);

 const trendStats = useMemo(() => {
 const total = trendData.reduce((s, d) => s + d.net, 0);
 const txCount = trendData.reduce((s, d) => s + d.count, 0);
 const best = Math.max(...trendData.map(d => d.net), 0);
 return { total, txCount, best };
 }, [trendData]);

 const periods = [
 { label: 'Today', value: breakdown?.daily, color: 'green' as const },
 { label: 'This Week', value: breakdown?.weekly, color: 'blue' as const },
 { label: 'This Month', value: breakdown?.monthly, color: 'primary' as const },
 { label: 'This Year', value: breakdown?.yearly, color: 'yellow' as const },
 { label: 'All Time', value: breakdown?.allTime, color: 'default' as const },
 ];

 if (robuxError) {
 return <IncomeErrorState title="Failed to load Robux data" onRetry={() => refetchRobux()} />;
 }

 return (
 <div className="space-y-6">
 {/* DevEx Info */}
 <div className="border border-border rounded-xl overflow-hidden bg-muted/50 border-dashed">
 <div className="p-4 pt-6">
 <div className="flex items-center gap-2 text-sm text-muted-foreground">
 <Gamepad2 className="h-4 w-4" />
 <span>Robux earnings after 30% Roblox tax. GBP estimates based on DevEx rate (~R$1000 ≈ £2.75)</span>
 </div>
 </div>
 </div>

 {/* Product Configuration */}
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <h3 className="font-semibold text-sm flex items-center gap-2">
 <Package className="h-5 w-5" />
 Product Robux Configuration
 </h3>
 </div>
 <div className="p-4">
 <div className="grid gap-4 md:grid-cols-2 mb-6">
 <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
 <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
 <CheckCircle2 className="h-5 w-5 text-green-500" />
 </div>
 <div>
 <p className="text-2xl font-bold text-green-500">{productsWithRobuxStatus?.configured.length ?? 0}</p>
 <p className="text-sm text-muted-foreground">Configured for Robux</p>
 </div>
 </div>
 <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
 <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
 <XCircle className="h-5 w-5 text-amber-500" />
 </div>
 <div>
 <p className="text-2xl font-bold text-amber-500">{productsWithRobuxStatus?.notConfigured.length ?? 0}</p>
 <p className="text-sm text-muted-foreground">Not Configured</p>
 </div>
 </div>
 </div>

 <ScrollArea className="h-[300px]">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>Product</TableHead>
 <TableHead className="text-center">GBP</TableHead>
 <TableHead className="text-center">Robux</TableHead>
 <TableHead>Product ID</TableHead>
 <TableHead className="text-right">Status</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {productsWithRobuxStatus?.configured.map(p => (
 <TableRow key={p.id}>
 <TableCell className="font-medium">{p.name}</TableCell>
 <TableCell className="text-center">{formatGBP(p.price)}</TableCell>
 <TableCell className="text-center text-purple-500 font-medium">R${p.robux_price?.toLocaleString() ?? '-'}</TableCell>
 <TableCell><span className="font-mono text-xs text-muted-foreground">{p.robux_product_id}</span></TableCell>
 <TableCell className="text-right">
 <Badge variant="default" className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />OK</Badge>
 </TableCell>
 </TableRow>
 ))}
 {productsWithRobuxStatus?.notConfigured.map(p => (
 <TableRow key={p.id} className="opacity-60">
 <TableCell className="font-medium">{p.name}</TableCell>
 <TableCell className="text-center">{formatGBP(p.price)}</TableCell>
 <TableCell className="text-center text-muted-foreground">-</TableCell>
 <TableCell className="text-muted-foreground">-</TableCell>
 <TableCell className="text-right">
 <Badge variant="outline" className="border-amber-500/50 text-amber-500"><XCircle className="h-3 w-3 mr-1" />No</Badge>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </ScrollArea>
 </div>
 </div>

 {/* Period Cards */}
 <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
 {periods.map(p => (
 <AdminStatCard
 key={p.label}
 label={p.label}
 value={`R$${(p.value?.net ?? 0).toLocaleString()}`}
 valueColor={p.color}
 subtitle={`≈ {formatGBP((p.value?.gbp ?? 0))}`}
 />
 ))}
 </div>

 {/* Chart + Stats */}
 <div className="grid gap-4 lg:grid-cols-[1fr,280px]">
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <h3 className="font-semibold text-sm">30-Day Robux Earnings Trend</h3>
 <p className="text-sm text-muted-foreground">Daily Robux earnings (after tax)</p>
 </div>
 <div className="p-4">
 <RevolutLineChart
 data={trendData}
 xKey="displayDate"
 series={[{ dataKey: 'net', color: 'hsl(185 85% 50%)', name: 'Net Robux' }]}
 height={300}
 yFormatter={(v) => `R$${v}`}
 tooltipFormatter={(v) => [`R$${Number(v).toLocaleString()}`, 'Net Robux']}
 />
 </div>
 </div>

 <div className="flex flex-col gap-4">
 <AdminStatCard label="30-Day Net Total" value={`R$${trendStats.total.toLocaleString()}`} valueColor="primary" />
 <AdminStatCard label="30-Day Transactions" value={trendStats.txCount} />
 <AdminStatCard label="Best Day (30d)" value={`R$${trendStats.best.toLocaleString()}`} valueColor="green" />
 </div>
 </div>

 {/* Transaction Log */}
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <h3 className="font-semibold text-sm flex items-center gap-2"><Gamepad2 className="h-5 w-5" />Recent Transactions</h3>
 </div>
 <div className="p-4">
 <ScrollArea className="h-[400px]">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>Date</TableHead>
 <TableHead>Username</TableHead>
 <TableHead>Product</TableHead>
 <TableHead className="text-right">Gross</TableHead>
 <TableHead className="text-right">Net</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {robuxTransactions && robuxTransactions.length > 0 ? (
 robuxTransactions.map(tx => (
 <TableRow key={tx.id}>
 <TableCell className="text-muted-foreground">{format(new Date(tx.created_at), 'MMM d, HH:mm')}</TableCell>
 <TableCell className="font-medium">{tx.roblox_username}</TableCell>
 <TableCell>{tx.product_name}</TableCell>
 <TableCell className="text-right text-muted-foreground">R${tx.robux_amount.toLocaleString()}</TableCell>
 <TableCell className="text-right font-medium text-green-500">R${tx.robux_after_tax.toLocaleString()}</TableCell>
 </TableRow>
 ))
 ) : (
 <TableRow>
 <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
 No transactions yet.
 </TableCell>
 </TableRow>
 )}
 </TableBody>
 </Table>
 </ScrollArea>
 </div>
 </div>

 {/* Integration */}
 <div className="border border-border rounded-xl overflow-hidden border-dashed">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <h3 className="font-semibold text-sm flex items-center gap-2 text-lg">
 <ExternalLink className="h-5 w-5" />
 Roblox Integration
 </h3>
 <p className="text-sm text-muted-foreground">Add the tracking script to your Roblox game to automatically log purchases</p>
 </div>
 <div className="p-4 text-sm text-muted-foreground space-y-2">
 <p>1. Enable HTTP Requests in your game settings on Roblox</p>
 <p>2. Create a Script in ServerScriptService</p>
 <p>3. Use the webhook URL provided in your backend settings</p>
 <p>4. Include your ROBUX_WEBHOOK_SECRET in requests</p>
 </div>
 </div>
 </div>
 );
}
