import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

export function TopProductsLeaderboard() {
  const { store } = useSellerStatus();

  const { data: topProducts, isLoading } = useQuery({
    queryKey: ['seller-top-products', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];

      // Use seller_transactions to count sales per product — avoids large .in() arrays
      // and naturally excludes refunded transactions
      const { data: salesData } = await supabase
        .from('seller_transactions')
        .select('order_item_id, description, net_amount')
        .eq('store_id', store.id)
        .eq('type', 'sale')
        .is('refunded_at', null);

      if (!salesData || salesData.length === 0) return [];

      // Get products for this store (just what we need for display)
      const { data: products } = await supabase
        .from('products')
        .select('id, name, images, price')
        .eq('store_id', store.id)
        .eq('is_active', true)
        .is('deleted_at', null);

      if (!products || products.length === 0) return [];

      // Count sales per product from order_items
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id')
        .in('id', salesData.map(s => s.order_item_id).filter(Boolean) as string[]);

      const salesMap = new Map<string, number>();
      (orderItems || []).forEach((item: any) => {
        if (item.product_id) {
          salesMap.set(item.product_id, (salesMap.get(item.product_id) || 0) + 1);
        }
      });

      // Enrich and sort
      const enriched = products.map(p => ({
        ...p,
        sales_count: salesMap.get(p.id) || 0,
      }));
      enriched.sort((a, b) => b.sales_count - a.sales_count);

      return enriched.slice(0, 5);
    },
    enabled: !!store?.id,
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Top Products
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm animate-pulse">
            Loading...
          </div>
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
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            No products yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}
