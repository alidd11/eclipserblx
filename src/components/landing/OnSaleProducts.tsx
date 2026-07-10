import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProductCard } from '@/components/ui/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { PrefetchLink as Link } from '@/components/PrefetchLink';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { getFirstImageUrl } from '@/lib/mediaUtils';
import { useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { usePreloadImages } from '@/hooks/usePreloadImages';

interface FlashSaleProduct {
  id: string;
  name: string;
  slug: string;
  product_number: number | null;
  price: number;
  images: string[] | null;
  created_at: string;
  category_id: string | null;
  categories: { name: string; slug: string } | null;
  stores: { name: string; slug: string; logo_url: string | null; is_verified: boolean; is_active: boolean; eclipse_plus_discount_enabled: boolean } | null;
  discountPercent?: number;
}

export function OnSaleProducts() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: saleProducts, isLoading } = useQuery({
    queryKey: ['on-sale-products-home'],
    queryFn: async () => {
      const now = new Date().toISOString();

      // Get active flash sales
      const { data: sales, error: salesErr } = await supabase
        .from('flash_sales')
        .select('id, discount_type, discount_value, product_ids, apply_to_all, store_id')
        .eq('is_active', true)
        .lte('starts_at', now)
        .gte('ends_at', now);

      if (salesErr || !sales?.length) return [];

      // Collect product IDs from flash sales
      const productIds = new Set<string>();
      const discountMap = new Map<string, number>();

      for (const sale of sales) {
        if (sale.product_ids?.length) {
          for (const pid of sale.product_ids) {
            productIds.add(pid);
            const pct = sale.discount_type === 'percentage' ? sale.discount_value : 0;
            discountMap.set(pid, Math.max(discountMap.get(pid) || 0, pct));
          }
        }
      }

      if (productIds.size === 0) return [];

      const { data: products, error } = await supabase
        .from('products')
        .select(`
          id, name, slug, product_number, price, images, created_at,
          category_id, categories(name, slug),
          stores!inner(name, slug, logo_url, is_verified, is_active, eclipse_plus_discount_enabled)
        `)
        .in('id', Array.from(productIds))
        .eq('is_active', true)
        .eq('moderation_status', 'approved')
        .eq('stores.is_active', true)
        .limit(12);

      if (error) throw error;

      return (products || []).map(p => ({
        ...p,
        discountPercent: discountMap.get(p.id) || 0,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.7;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  const imageUrls = useMemo(() =>
    (saleProducts || []).slice(0, 4).map(p => getFirstImageUrl(p.images)).filter(Boolean),
    [saleProducts]
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

  if (!saleProducts?.length) return null;

  return (
    <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      <ScrollReveal direction="up" distance={16} duration={0.35}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="border-l-2 border-primary pl-3">
              <h2 className="text-base sm:text-lg lg:text-xl font-bold tracking-tight uppercase">On Sale</h2>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-red-400/80 font-semibold bg-red-500/10 px-1.5 py-0.5 rounded">
              Sale!
            </span>
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
            <Link to="/products" className="text-sm text-foreground hover:text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        <div ref={scrollRef} className="flex gap-3 lg:gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0">
          {saleProducts.map((product, index) => {
            const store = product.stores as any;
            const category = product.categories as any;
            return (
              <div key={product.id} className="min-w-[200px] max-w-[240px] flex-shrink-0 snap-start sm:min-w-[220px] sm:max-w-[260px] lg:min-w-0 lg:max-w-none relative">
                {product.discountPercent > 0 && (
                  <div className="absolute top-2 right-2 z-10 bg-red-500 text-foreground text-[10px] font-bold px-1.5 py-0.5 rounded">
                    -{product.discountPercent}%
                  </div>
                )}
                <ProductCard
                  id={product.id}
                  name={product.name}
                  slug={String(product.product_number || product.id)}
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
