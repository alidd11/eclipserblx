import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PrefetchLink as Link } from '@/components/PrefetchLink';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight } from 'lucide-react';
import { ProductCard } from '@/components/ui/ProductCard';
import { ProductCardSkeleton } from '@/components/ui/ProductCardSkeleton';
import { getFirstImageUrl } from '@/lib/mediaUtils';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { usePreloadImages } from '@/hooks/usePreloadImages';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

export function TrendingProducts() {
  const { data: products, isLoading } = useQuery({
    queryKey: ['trending-products-home'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, slug, price, images, download_count, created_at, category_id,
          categories(name, slug),
          stores!inner(is_active, name, slug, logo_url, is_verified, eclipse_plus_discount_enabled)
        `)
        .eq('is_active', true)
        .eq('moderation_status', 'approved')
        .eq('stores.is_active', true)
        .order('download_count', { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const imageUrls = useMemo(() => 
    (products || []).slice(0, 8).map(p => getFirstImageUrl(p.images)).filter(Boolean),
    [products]
  );
  usePreloadImages(imageUrls);

  if (isLoading) {
    return (
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </section>
    );
  }

  if (!products?.length) return null;

  return (
    <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      <ScrollReveal direction="up" distance={16} duration={0.35}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="border-l-2 border-primary pl-3">
              <h2 className="text-base sm:text-lg lg:text-xl font-bold tracking-tight uppercase">Trending Now</h2>
            </div>
            <span className="text-[10px] text-muted-foreground font-medium bg-muted/60 px-1.5 py-0.5 rounded">{products.length} items</span>
          </div>
          <Link to="/products?sort=popular" className="text-sm text-foreground hover:text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Masonry layout using CSS columns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {products.map((product, idx) => {
            const store = product.stores as any;
            const category = product.categories as any;
            return (
              <div 
                key={product.id} 
                className="animate-fade-in"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <MasonryProductCard
                  product={product}
                  store={store}
                  category={category}
                  isTall={false}
                  rank={idx + 1}
                />
              </div>
            );
          })}
        </div>
      </ScrollReveal>
    </section>
  );
}

/** Masonry-specific card with variable aspect ratio */
function MasonryProductCard({ 
  product, 
  store, 
  category, 
  isTall, 
  rank 
}: { 
  product: any; 
  store: any; 
  category: any; 
  isTall: boolean; 
  rank: number;
}) {
  return (
    <div className="relative">
      {/* Rank badge */}
      <div className="absolute top-2 left-2 z-10 flex items-center justify-center w-6 h-6 rounded-full bg-background/90 backdrop-blur-sm border border-border shadow-sm">
        <span className="text-[10px] font-bold text-foreground">
          {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`}
        </span>
      </div>
      <ProductCard
        id={product.id}
        name={product.name}
        slug={product.slug}
        price={product.price}
        image={getFirstImageUrl(product.images)}
        images={product.images as string[]}
        category={category?.name}
        categorySlug={category?.slug}
        categoryId={product.category_id ?? undefined}
        storeName={store?.name}
        storeSlug={store?.slug}
        storeLogo={store?.logo_url}
        isVerified={store?.is_verified}
        storeEclipseEnabled={store?.eclipse_plus_discount_enabled}
        createdAt={product.created_at}
        priority
      />
    </div>
  );
}
