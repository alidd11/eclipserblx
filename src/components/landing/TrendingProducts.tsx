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
import { useMemo, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export function TrendingProducts() {
  const { data: products, isLoading, isError } = useQuery({
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
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </section>
    );
  }

  // Don't collapse to null — maintain layout space so LazySection below can trigger
  if (!products?.length && !isError) return null;
  if (isError || !products?.length) {
    return <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6" />;
  }

  return (
    <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      <ScrollReveal direction="up" distance={16} duration={0.35}>
        <div className="flex items-end justify-between gap-4 mb-6 pb-4 border-b border-border/60">
          <div className="min-w-0">
            <span className="block text-[10px] font-semibold tracking-[0.25em] uppercase text-primary mb-1.5">
              Popular right now
            </span>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight text-foreground">
              Trending
            </h2>
          </div>
          <Link
            to="/products?sort=popular"
            className="shrink-0 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 uppercase tracking-widest font-semibold"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Masonry layout using CSS columns */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
const MasonryProductCard = forwardRef<HTMLDivElement, {
  product: any;
  store: any;
  category: any;
  isTall: boolean;
  rank: number;
}>(function MasonryProductCard({ product, store, category, isTall, rank }, ref) {
  return (
    <div ref={ref} className="relative">
      {/* Rank badge — editorial numeral */}
      <div className="absolute top-4 left-4 z-[4] pointer-events-none">
        <span className="inline-flex items-center h-5 px-1.5 text-[10px] font-bold tracking-wider bg-foreground text-background rounded-sm shadow-sm">
          {`#${rank}`}
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
});

