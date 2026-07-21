import { Link } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { useFeaturedProducts, type ScoredProduct } from '@/hooks/useFeaturedProducts';
import { useCurrency } from '@/hooks/useCurrency';
import { optimizeImageUrl } from '@/utils/optimizeImageUrl';

/**
 * Fallback shown in place of RecentlyViewedProducts when the visitor has no
 * browsing history — keeps the empty cart from being a dead end either way.
 */
export function CartTrendingFallback() {
  const { data: products } = useFeaturedProducts({ limit: 6, maxPerStore: 2, queryKey: 'cart-empty-trending' });
  const { formatPrice } = useCurrency();

  if (!products || products.length === 0) return null;

  return (
    <section aria-label="Trending products" className="mt-8">
      <div className="flex items-center justify-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-foreground">Trending Now</h2>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {products.map((product: ScoredProduct) => {
          const productNumber = (product as unknown as { product_number?: string | number }).product_number;
          const slug = productNumber ? String(productNumber) : product.slug;
          const image = product.images?.[0];
          return (
            <Link
              key={product.id}
              to={`/products/${slug}`}
              className="group block rounded-lg border border-border bg-card overflow-hidden hover:border-primary/40 transition-colors"
            >
              <div className="aspect-square bg-muted overflow-hidden">
                {image ? (
                  <img
                    src={optimizeImageUrl(image, 160, 160, 'contain')}
                    alt={product.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-lg font-bold text-muted-foreground/30">{product.name.charAt(0)}</span>
                  </div>
                )}
              </div>
              <div className="p-1.5">
                <p className="text-[10px] font-medium text-foreground truncate">{product.name}</p>
                <p className="text-[10px] font-bold text-muted-foreground">{formatPrice(product.price)}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
