import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProductCard } from '@/components/ui/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight } from 'lucide-react';
import { PrefetchLink as Link } from '@/components/PrefetchLink';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { getFirstImageUrl } from '@/lib/mediaUtils';
import { useMemo } from 'react';
import { usePreloadImages } from '@/hooks/usePreloadImages';

export function RecentReleases() {
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
        .limit(4);
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const imageUrls = useMemo(() =>
    (products || []).slice(0, 4).map(p => getFirstImageUrl(p.images, 620, 465, 'contain')).filter(Boolean),
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
        <div className="flex items-end justify-between gap-4 mb-6 pb-4 border-b border-border/60">
          <div className="min-w-0">
            <span className="block text-[10px] font-semibold tracking-[0.25em] uppercase text-primary mb-1.5">
              Fresh from creators
            </span>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight text-foreground">
              Recent releases
            </h2>
          </div>
          <Link
            to="/products?sort=newest"
            className="shrink-0 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 uppercase tracking-widest font-semibold"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {products.map((product, index) => {
            const store = product.stores as any;
            const category = product.categories as any;
            return (
              <div key={product.id}>
                <ProductCard
                  id={product.id}
                  name={product.name}
                  slug={String((product as any).product_number)}
                  price={product.price}
                  image={getFirstImageUrl(product.images, 620, 465, 'contain')}
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
