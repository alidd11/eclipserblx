import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCart, CartItem } from '@/hooks/useCart';
import { useCurrency } from '@/hooks/useCurrency';
import { Link } from 'react-router-dom';
import { Plus, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getFirstImageUrl } from '@/lib/mediaUtils';

/**
 * Shows products frequently bought with items currently in the cart.
 * Appears on the cart page to increase AOV.
 */
export function CartUpsells() {
  const { items, addItem, isInCart } = useCart();
  const { formatPrice } = useCurrency();

  const cartProductIds = items.map(i => i.id);

  const { data: suggestions } = useQuery({
    queryKey: ['cart-upsells', cartProductIds.join(',')],
    queryFn: async () => {
      if (cartProductIds.length === 0) return [];

      // Find orders containing any cart item
      const { data: orderIds } = await supabase
        .from('order_items')
        .select('order_id')
        .in('product_id', cartProductIds)
        .limit(100);

      if (!orderIds?.length) return [];

      const ids = [...new Set(orderIds.map(o => o.order_id))];

      // Find co-purchased products
      const { data: coItems } = await supabase
        .from('order_items')
        .select('product_id, product_name, price')
        .in('order_id', ids)
        .limit(300);

      if (!coItems?.length) return [];

      // Count frequency, exclude items already in cart
      const freqMap = new Map<string, { name: string; price: number; count: number }>();
      coItems.forEach((item) => {
        if (!item.product_id || cartProductIds.includes(item.product_id)) return;
        const existing = freqMap.get(item.product_id);
        if (existing) existing.count++;
        else freqMap.set(item.product_id, { name: item.product_name, price: item.price, count: 1 });
      });

      const topIds = Array.from(freqMap.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 4)
        .map(([id]) => id);

      if (topIds.length === 0) return [];

      const { data: products } = await supabase
        .from('products')
        .select('id, name, slug, product_number, price, images, is_active, category_id, is_resellable')
        .in('id', topIds)
        .eq('is_active', true);

      return products || [];
    },
    enabled: cartProductIds.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  if (!suggestions?.length) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Customers also bought</h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {suggestions.map((product) => (
          <div key={product.id} className="rounded-lg border border-border bg-card overflow-hidden group">
            <Link to={`/products/${product.product_number}`}>
              <div className="aspect-[4/3] bg-muted overflow-hidden">
                {(() => {
                  const imgUrl = getFirstImageUrl(product.images);
                  return imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={product.name}
                      loading="lazy"
                      className="w-full h-full object-contain transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-lg font-bold text-muted-foreground/30">{product.name?.charAt(0)}</span>
                    </div>
                  );
                })()}
              </div>
            </Link>
            <div className="p-2 space-y-1">
              <p className="text-xs font-medium text-foreground truncate">{product.name}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">{formatPrice(product.price)}</span>
                {!isInCart(product.id) && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => addItem({
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      image: getFirstImageUrl(product.images) || product.images?.[0],
                      slug: String(product.product_number),
                       category_id: product.category_id ?? undefined,
                       is_resellable: product.is_resellable ?? undefined,
                    })}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
