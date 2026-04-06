import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { CardLoadingSkeleton, CardEmptyState } from './DashboardPlaceholders';

interface ProductVelocity {
 productName: string;
 currentPeriodSales: number;
 previousPeriodSales: number;
 currentRevenue: number;
 trend: 'up' | 'down' | 'flat';
 changePercent: number;
}

export function SalesVelocityInsights() {
 const { store } = useSellerStatus();
 const { formatPrice } = useCurrency();

 const { data: velocityData, isLoading } = useQuery({
 queryKey: ['sales-velocity', store?.id],
 queryFn: async (): Promise<ProductVelocity[]> => {
 if (!store?.id) return [];

 const now = new Date();
 const last7 = new Date(now.getTime() - 7 * 86400000).toISOString();
 const prev7 = new Date(now.getTime() - 14 * 86400000).toISOString();

 const { data: transactions } = await supabase
 .from('seller_transactions')
 .select('description, net_amount, created_at')
 .eq('store_id', store.id)
 .eq('type', 'sale')
 .is('refunded_at', null)
 .gte('created_at', prev7)
 .order('created_at', { ascending: false });

 if (!transactions?.length) return [];

 const productMap = new Map<string, { current: number; previous: number; revenue: number }>();

 transactions.forEach((t: any) => {
 const name = t.description?.replace(/^Sale: /, '').split(' — ')[0] || 'Unknown';
 if (!productMap.has(name)) {
 productMap.set(name, { current: 0, previous: 0, revenue: 0 });
 }
 const entry = productMap.get(name)!;
 const isCurrentPeriod = new Date(t.created_at) >= new Date(last7);

 if (isCurrentPeriod) {
 entry.current++;
 entry.revenue += t.net_amount || 0;
 } else {
 entry.previous++;
 }
 });

 return Array.from(productMap.entries())
 .map(([productName, data]) => {
 const changePercent = data.previous === 0
 ? (data.current > 0 ? 100 : 0)
 : Math.round(((data.current - data.previous) / data.previous) * 100);

 return {
 productName,
 currentPeriodSales: data.current,
 previousPeriodSales: data.previous,
 currentRevenue: data.revenue,
 trend: changePercent > 0 ? 'up' as const : changePercent < 0 ? 'down' as const : 'flat' as const,
 changePercent: Math.abs(changePercent),
 };
 })
 .sort((a, b) => b.currentPeriodSales - a.currentPeriodSales)
 .slice(0, 8);
 },
 enabled: !!store?.id,
 staleTime: 5 * 60 * 1000,
 });

 const trendConfig = {
 up: { icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10', label: '+' },
 down: { icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-500/10', label: '-' },
 flat: { icon: Minus, color: 'text-muted-foreground', bg: 'bg-muted', label: '' },
 };

 return (
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30 pb-2">
 <div className="flex items-center justify-between">
 <h3 className="font-semibold text-sm text-base font-medium flex items-center gap-2">
 <BarChart3 className="h-4 w-4" />
 Sales Velocity
 </h3>
 <span className="text-xs text-muted-foreground">7d vs prior 7d</span>
 </div>
 </div>
 <div className="p-4">
 {isLoading ? (
 <CardLoadingSkeleton rows={4} />
 ) : !velocityData?.length ? (
 <CardEmptyState icon={BarChart3} title="No sales data" subtitle="Sales trends appear after your first week" />
 ) : (
 <div className="space-y-2">
 {velocityData.map((product) => {
 const config = trendConfig[product.trend];
 const TrendIcon = config.icon;

 return (
 <div
 key={product.productName}
 className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
 >
 <div className="flex-1 min-w-0">
 <p className="text-sm font-medium truncate">{product.productName}</p>
 <p className="text-xs text-muted-foreground">
 {product.currentPeriodSales} sale{product.currentPeriodSales !== 1 ? 's' : ''} · {formatPrice(product.currentRevenue)}
 </p>
 </div>

 <div className={cn("flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium", config.bg, config.color)}>
 <TrendIcon className="h-3 w-3" />
 {product.changePercent > 0 && (
 <span>{config.label}{product.changePercent}%</span>
 )}
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 </div>
 );
}
