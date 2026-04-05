import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PrefetchLink as Link } from '@/components/PrefetchLink';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, ArrowRight } from 'lucide-react';
import { ProductCard } from '@/components/ui/ProductCard';
import { ProductCardSkeleton } from '@/components/ui/ProductCardSkeleton';
import { getFirstImageUrl } from '@/lib/mediaUtils';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { usePreloadImages } from '@/hooks/usePreloadImages';
import { useMemo } from 'react';

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
        <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
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
            <div className="p-1.5 rounded-lg bg-primary/10">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-base sm:text-lg lg:text-xl font-bold tracking-tight uppercase">Trending Now</h2>
            <span className="text-[10px] text-muted-foreground font-medium bg-muted/60 px-1.5 py-0.5 rounded">{products.length} items</span>
          </div>
          <Link to="/products?sort=popular" className="text-xs text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Mobile: horizontal scroll, 2 rows */}
        <div className="sm:hidden overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 snap-x snap-mandatory">
          <div className="grid grid-rows-2 grid-flow-col auto-cols-[45%] gap-2 snap-start">
            {products.map((product) => {
              const store = product.stores as any;
              const category = product.categories as any;
              return (
                <ProductCard
                  key={product.id}
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
              );
            })}
          </div>
        </div>

        {/* Desktop: normal grid */}
        <div className="hidden sm:grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          {products.map((product) => {
            const store = product.stores as any;
            const category = product.categories as any;
            return (
              <ProductCard
                key={product.id}
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
            );
          })}
        </div>
      </ScrollReveal>
    </section>
  );
}
