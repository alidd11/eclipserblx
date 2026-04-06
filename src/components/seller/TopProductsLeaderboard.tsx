import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCurrency } from '@/hooks/useCurrency';
import { CardLoadingSkeleton, CardEmptyState } from './DashboardPlaceholders';

export function TopProductsLeaderboard() {
  const { store } = useSellerStatus();
  const { formatPrice: formatCurrency } = useCurrency();

  const { data: topProducts, isLoading } = useQuery({
    queryKey: ['seller-top-products', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];

      const { data: salesData } = await supabase
        .from('seller_transactions')
        .select('order_item_id, description, net_amount')
        .eq('store_id', store.id)
        .eq('type', 'sale')
        .is('refunded_at', null);

      if (!salesData || salesData.length === 0) return [];

      const { data: products } = await supabase
        .from('products')
        .select('id, name, images, price')
        .eq('store_id', store.id)
        .eq('is_active', true)
        .is('deleted_at', null);

      if (!products || products.length === 0) return [];

      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id')
        .in('id', salesData.map(s => s.order_item_id).filter(Boolean) as string[]);

      const salesMap = new Map<string, number>();
      (orderItems || []).forEach((item) => {
        if (item.product_id) {
          salesMap.set(item.product_id, (salesMap.get(item.product_id) || 0) + 1);
        }
      });

      const enriched = products.map(p => ({
        ...p,
        sales_count: salesMap.get(p.id) || 0,
      }));
      enriched.sort((a, b) => b.sales_count - a.sales_count);

      return enriched.slice(0, 5);
    },
    enabled: !!store?.id,
    staleTime: 3 * 60 * 1000,
  });

  return (
    <div className="rounded-xl border border-border/50 bg-card">
      <div className="flex items-center justify-between p-4 pb-2">
        <h3 className="text-base font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Top Products
        </h3>
        <Link to="/seller/products" className="text-xs text-primary hover:underline">
          View All
        </Link>
      </div>
      <div className="p-4 pt-0 space-y-2">
        {isLoading ? (
          <CardLoadingSkeleton rows={4} />
        ) : topProducts && topProducts.length > 0 ? (
          topProducts.map((product, index) => {
            const imageUrl = (product.images as string[])?.[0];
            return (
              <div key={product.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <span className="text-sm font-bold text-muted-foreground w-5 text-center">
                  {index + 1}
                </span>
                <Avatar className="h-9 w-9 rounded-md">
                  <AvatarImage src={imageUrl} className="object-cover" />
                  <AvatarFallback className="rounded-md bg-muted text-xs">
                    {product.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {product.sales_count || 0} sales
                  </p>
                </div>
                <span className="text-sm font-semibold shrink-0">
                  {formatCurrency(product.price || 0)}
                </span>
              </div>
            );
          })
        ) : (
          <CardEmptyState icon={TrendingUp} title="No products yet" subtitle="Products will rank here by sales" />
        )}
      </div>
    </div>
  );
}
