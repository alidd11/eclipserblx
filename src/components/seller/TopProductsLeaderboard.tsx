import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TrendingUp } from 'lucide-react';

export function TopProductsLeaderboard() {
  const { store } = useSellerStatus();

  const { data: topProducts, isLoading } = useQuery({
    queryKey: ['seller-top-products', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];

      const { data } = await supabase
        .from('products')
        .select('id, name, images, download_count, price')
        .eq('store_id', store.id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('download_count', { ascending: false, nullsFirst: false })
        .limit(5);

      return data || [];
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
                    {product.download_count || 0} sales
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
