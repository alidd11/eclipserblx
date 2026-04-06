import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProductCard } from '@/components/ui/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { PrefetchLink as Link } from '@/components/PrefetchLink';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { getFirstImageUrl } from '@/lib/mediaUtils';
import { useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { usePreloadImages } from '@/hooks/usePreloadImages';

export function RecentReleases() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ['recent-releases-home'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, slug, product_number, price, images, created_at, download_count,
          category_id, categories(name, slug),
          stores!inner(name, slug, logo_url, is_verified, is_active, eclipse_plus_discount_enabled)
        `)
        .eq('is_active', true)
        .eq('moderation_status', 'approved')
        .eq('stores.is_active', true)
        .order('created_at', { ascending: false })
        .limit(12);
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.7;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  const imageUrls = useMemo(() =>
    (products || []).slice(0, 4).map(p => getFirstImageUrl(p.images)).filter(Boolean),
    [products]
  );
  usePreloadImages(imageUrls);

  if (isLoading) {
    return (
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="min-w-[220px] aspect-[4/3] rounded-lg" />
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
            <div className="p-1.5 rounded-lg bg-blue-500/10">
              <Clock className="h-4 w-4 text-blue-400" />
            </div>
            <h2 className="text-base sm:text-lg lg:text-xl font-bold tracking-tight uppercase">Recent Releases</h2>
            <span className="text-[10px] text-muted-foreground font-medium bg-muted/60 px-1.5 py-0.5 rounded">{products.length} items</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1">
              <Button variant="outline" size="icon" aria-label="Go back" className="h-7 w-7 rounded-md" onClick={() => scroll('left')}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" size="icon" aria-label="Go forward" className="h-7 w-7 rounded-md" onClick={() => scroll('right')}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Link to="/products?sort=newest" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        <div ref={scrollRef} className="flex gap-3 lg:gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory lg:grid lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 lg:overflow-visible lg:pb-0">
          {products.map((product, index) => {
            const store = product.stores as any;
            const category = product.categories as any;
            return (
              <div key={product.id} className="w-[48%] min-w-[160px] flex-shrink-0 snap-start sm:w-[44%] sm:min-w-[200px] lg:w-auto lg:min-w-0">
                <ProductCard
                  id={product.id}
                  name={product.name}
                  slug={String((product as any).product_number)}
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
                  showNewBadge
                  priority={index < 4}
                />
              </div>
            );
          })}
        </div>
      </ScrollReveal>
    </section>
  );
}
