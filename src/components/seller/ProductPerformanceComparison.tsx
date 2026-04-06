import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, Eye, ShoppingCart, TrendingUp } from 'lucide-react';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ProductMetrics {
 id: string;
 name: string;
 sales: number;
 revenue: number;
 views: number;
 conversionRate: number;
}

export function ProductPerformanceComparison() {
 const { store } = useSellerStatus();
 const { formatPrice } = useCurrency();
 const [productA, setProductA] = useState<string>('');
 const [productB, setProductB] = useState<string>('');

 // Fetch all products for selection
 const { data: products } = useQuery({
 queryKey: ['seller-products-list', store?.id],
 queryFn: async () => {
 if (!store?.id) return [];
 const { data } = await supabase
 .from('products')
 .select('id, name')
 .eq('store_id', store.id)
 .eq('is_active', true)
 .order('name');
 return data || [];
 },
 enabled: !!store?.id,
 });

 // Fetch metrics for selected products
 const { data: metrics, isLoading } = useQuery({
 queryKey: ['product-comparison', productA, productB, store?.id],
 queryFn: async (): Promise<ProductMetrics[]> => {
 if (!store?.id) return [];
 const ids = [productA, productB].filter(Boolean);
 if (ids.length === 0) return [];

 // Get sales data
 const { data: sales } = await supabase
 .from('seller_transactions')
 .select('description, net_amount, order_item_id')
 .eq('store_id', store.id)
 .eq('type', 'sale')
 .is('refunded_at', null);

 // Get order items for product mapping
 const { data: orderItems } = await supabase
 .from('order_items')
 .select('id, product_id')
 .in('product_id', ids);

 // Get view counts from page_visits
 const { data: views } = await supabase
 .from('page_visits')
 .select('page_path')
 .or(ids.map(id => {
 const product = products?.find(p => p.id === id);
 return product ? `page_path.like.%/products/${encodeURIComponent(product.name.toLowerCase().replace(/\s+/g, '-'))}%` : '';
 }).filter(Boolean).join(','));

 // Build metrics
 const orderItemMap = new Map<string, string>();
 orderItems?.forEach((oi) => {
 orderItemMap.set(oi.id, oi.product_id);
 });

 return ids.map(id => {
 const product = products?.find(p => p.id === id);
 const productSales = sales?.filter((s: any) => {
 const productId = orderItemMap.get(s.order_item_id);
 return productId === id;
 }) || [];
 const productViews = views?.filter((v: any) => 
 v.page_path?.includes(product?.name?.toLowerCase().replace(/\s+/g, '-'))
 )?.length || 0;
 const revenue = productSales.reduce((sum: number, s: any) => sum + (s.net_amount || 0), 0);
 const salesCount = productSales.length;

 return {
 id,
 name: product?.name || 'Unknown',
 sales: salesCount,
 revenue,
 views: productViews,
 conversionRate: productViews > 0 ? (salesCount / productViews) * 100 : 0,
 };
 });
 },
 enabled: !!store?.id && (!!productA || !!productB),
 staleTime: 1000 * 60 * 5,
 });

 const statRows = [
 { label: 'Sales', key: 'sales' as const, icon: ShoppingCart, format: (v: number) => v.toString() },
 { label: 'Revenue', key: 'revenue' as const, icon: TrendingUp, format: (v: number) => formatPrice(v) },
 { label: 'Views', key: 'views' as const, icon: Eye, format: (v: number) => v.toString() },
 { label: 'Conversion', key: 'conversionRate' as const, icon: BarChart3, format: (v: number) => `${v.toFixed(1)}%` },
 ];

 return (
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30 pb-3">
 <h3 className="font-semibold text-sm text-base font-medium flex items-center gap-2">
 <BarChart3 className="h-4 w-4" />
 Compare Products
 </h3>
 </div>
 <div className="p-4 space-y-4">
 {/* Product selectors */}
 <div className="grid grid-cols-2 gap-3">
 <Select value={productA} onValueChange={setProductA}>
 <SelectTrigger className="text-xs h-9">
 <SelectValue placeholder="Product A" />
 </SelectTrigger>
 <SelectContent>
 {products?.filter(p => p.id !== productB).map(p => (
 <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 <Select value={productB} onValueChange={setProductB}>
 <SelectTrigger className="text-xs h-9">
 <SelectValue placeholder="Product B" />
 </SelectTrigger>
 <SelectContent>
 {products?.filter(p => p.id !== productA).map(p => (
 <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {/* Comparison table */}
 {isLoading ? (
 <div className="space-y-2">
 {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10" />)}
 </div>
 ) : metrics && metrics.length > 0 ? (
 <div className="space-y-1.5">
 {statRows.map(({ label, key, icon: Icon, format }) => {
 const a = metrics[0]?.[key] ?? 0;
 const b = metrics[1]?.[key] ?? 0;
 const aWins = a > b;
 const bWins = b > a;

 return (
 <div key={key} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-sm">
 <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
 <span className="text-muted-foreground w-20 text-xs">{label}</span>
 <span className={cn("flex-1 text-right font-medium text-xs", aWins && "text-primary")}>
 {format(a)}
 </span>
 <span className="text-muted-foreground/40 text-xs">vs</span>
 <span className={cn("flex-1 font-medium text-xs", bWins && "text-primary")}>
 {metrics[1] ? format(b) : '—'}
 </span>
 </div>
 );
 })}
 </div>
 ) : (
 <p className="text-sm text-muted-foreground text-center py-4">Select products to compare</p>
 )}
 </div>
 </div>
 );
}
