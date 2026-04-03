import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PrefetchLink as Link } from '@/components/PrefetchLink';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, ArrowRight } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';
import { optimizeImageUrl } from '@/utils/optimizeImageUrl';
import { getFirstImageUrl } from '@/lib/mediaUtils';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

export function TrendingProducts() {
  const { formatPrice } = useCurrency();

  const { data: products, isLoading } = useQuery({
    queryKey: ['trending-products-home'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, slug, price, images, total_sales, stores!inner(is_active, name, slug, is_verified)')
        .eq('is_active', true)
        .eq('moderation_status', 'approved')
        .eq('stores.is_active', true)
        .order('total_sales', { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <section className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="flex gap-3 overflow-hidden lg:grid lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="min-w-[200px] lg:min-w-0">
              <Skeleton className="aspect-[4/3] rounded-lg" />
              <Skeleton className="h-4 w-3/4 mt-2" />
              <Skeleton className="h-3 w-1/2 mt-1" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!products?.length) return null;

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-6">
      <ScrollReveal direction="up" distance={16} duration={0.35}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-bold tracking-tight">Trending Now</h2>
          </div>
          <Link to="/products?sort=popular" className="text-xs text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide lg:grid lg:grid-cols-4 lg:overflow-visible lg:pb-0">
          {products.map((product, i) => {
            const imageUrl = getFirstImageUrl(product.images);
            return (
              <ScrollReveal key={product.id} delay={i * 0.05} direction="up" distance={12} duration={0.3}>
                <Link to={`/product/${product.slug}`} className="block min-w-[180px] lg:min-w-0 group">
                  <div className="aspect-[4/3] rounded-lg overflow-hidden bg-muted border border-border">
                    {imageUrl ? (
                      <img
                        src={optimizeImageUrl(imageUrl, 400)}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No image</div>
                    )}
                  </div>
                  <h3 className="text-sm font-medium mt-2 truncate group-hover:text-primary transition-colors">{product.name}</h3>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-xs font-semibold text-primary">
                      {product.price === 0 ? 'Free' : formatPrice(product.price)}
                    </span>
                    {(product.total_sales ?? 0) > 0 && (
                      <span className="text-[10px] text-muted-foreground">{product.total_sales} sales</span>
                    )}
                  </div>
                </Link>
              </ScrollReveal>
            );
          })}
        </div>
      </ScrollReveal>
    </section>
  );
}
