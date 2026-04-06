import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { getFirstImageUrl } from '@/lib/mediaUtils';

/**
 * Personalized "For You" section on the homepage.
 * Uses recently viewed items to find products in the same categories.
 */
export function ForYouSection() {
  const { user } = useAuth();
  const { recentlyViewed } = useRecentlyViewed();
  const { formatPrice } = useCurrency();

  // We need browsing history to personalize
  const recentIds = recentlyViewed.map(p => p.id).slice(0, 6);

  const { data: recommendations } = useQuery({
    queryKey: ['for-you', recentIds.join(',')],
    queryFn: async () => {
      if (recentIds.length === 0) return [];

      // Get categories from recently viewed products
      const { data: viewedProducts } = await supabase
        .from('products')
        .select('category_id')
        .in('id', recentIds);

      if (!viewedProducts?.length) return [];

      const categoryIds = [...new Set(viewedProducts.map(p => p.category_id).filter(Boolean))];
      if (categoryIds.length === 0) return [];

      // Find similar products user hasn't viewed
      const { data: recs } = await supabase
        .from('products')
        .select('id, name, slug, product_number, price, images')
        .in('category_id', categoryIds)
        .not('id', 'in', `(${recentIds.join(',')})`)
        .eq('is_active', true)
        .order('total_sales', { ascending: false })
        .limit(8);

      return recs || [];
    },
    enabled: recentIds.length > 0,
    staleTime: 1000 * 60 * 10,
  });

  if (!recommendations?.length) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-display font-bold">Recommended For You</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {recommendations.slice(0, 4).map((product) => (
          <Link
            key={product.id}
            to={`/products/${product.product_number}`}
            className="group block rounded-lg border border-border bg-card overflow-hidden hover:border-primary/40 transition-colors"
          >
            <div className="aspect-square bg-muted overflow-hidden">
              {(() => {
                const imgUrl = getFirstImageUrl(product.images);
                return imgUrl ? (
                  <img
                    src={imgUrl}
                    alt={product.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-xl font-bold text-muted-foreground/30">{product.name?.charAt(0)}</span>
                  </div>
                );
              })()}
            </div>
            <div className="p-2">
              <p className="text-xs font-medium text-foreground truncate">{product.name}</p>
              <p className="text-xs font-bold text-primary">{formatPrice(product.price)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
