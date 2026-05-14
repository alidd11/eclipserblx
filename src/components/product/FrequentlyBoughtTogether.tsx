import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { useCurrency } from '@/hooks/useCurrency';
import { ShoppingBag } from 'lucide-react';

interface Props {
  productId: string;
  categoryId?: string | null;
  storeId?: string | null;
}

/**
 * Shows products frequently purchased alongside the current product.
 * Uses order_items co-occurrence: "customers who bought X also bought Y".
 */
export function FrequentlyBoughtTogether({ productId, categoryId, storeId }: Props) {
  const { formatPrice } = useCurrency();

  const { data: products } = useQuery({
    queryKey: ['frequently-bought', productId],
    queryFn: async () => {
      // Step 1: Find orders containing this product
      const { data: orderIds } = await supabase
        .from('order_items')
        .select('order_id')
        .eq('product_id', productId)
        .limit(50);

      if (!orderIds?.length) return [];

      const ids = orderIds.map(o => o.order_id);

      // Step 2: Find other products in those same orders
      const { data: coItems } = await supabase
        .from('order_items')
        .select('product_id, product_name, price')
        .in('order_id', ids)
        .neq('product_id', productId)
        .limit(200);

      if (!coItems?.length) return [];

      // Step 3: Count frequency & deduplicate
      const freqMap = new Map<string, { name: string; price: number; count: number }>();
      coItems.forEach((item) => {
        if (!item.product_id) return;
        const existing = freqMap.get(item.product_id);
        if (existing) {
          existing.count++;
        } else {
          freqMap.set(item.product_id, {
            name: item.product_name,
            price: item.price,
            count: 1,
          });
        }
      });

      // Step 4: Sort by frequency, take top 4
      const sorted = Array.from(freqMap.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 4);

      if (sorted.length === 0) return [];

      // Step 5: Get full product details with images/slugs
      const productIds = sorted.map(([id]) => id);
      const { data: fullProducts } = await supabase
        .from('products')
        .select('id, name, slug, product_number, price, images, is_active')
        .in('id', productIds)
        .eq('is_active', true);

      if (!fullProducts?.length) return [];

      // Maintain frequency ordering
      return productIds
        .map(id => fullProducts.find((p) => p.id === id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p));
    },
    enabled: !!productId,
    staleTime: 1000 * 60 * 10,
  });

  if (!products?.length) return null;

  return (
    <section aria-label="Frequently bought together" className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <ShoppingBag className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground">Frequently Bought Together</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {products.map((product) => (
          <Link
            key={product.id}
            to={`/products/${(product as any).product_number}`}
            className="group block rounded-lg border border-border bg-card overflow-hidden hover:border-primary/40 transition-colors"
          >
            <div className="aspect-square bg-muted overflow-hidden">
              {product.images?.[0] ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-contain transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-lg font-bold text-muted-foreground/30">
                    {product.name?.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            <div className="p-2">
              <p className="text-xs font-medium text-foreground truncate">{product.name}</p>
              <p className="text-xs font-bold text-muted-foreground">{formatPrice(product.price)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
