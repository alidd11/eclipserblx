import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProductCard } from '@/components/ui/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, ArrowRight } from 'lucide-react';
import { PrefetchLink as Link } from '@/components/PrefetchLink';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { getFirstImageUrl } from '@/lib/mediaUtils';

export function NewThisWeek() {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: products, isLoading } = useQuery({
    queryKey: ['new-this-week'],
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
        .gte('created_at', oneWeekAgo)
        .order('created_at', { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <section className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="flex gap-3 overflow-hidden lg:grid lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="min-w-[160px] lg:min-w-0 aspect-[4/3] rounded-lg" />
          ))}
        </div>
      </section>
    );
  }

  if (!products?.length) return null;

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <ScrollReveal direction="up" distance={16} duration={0.35}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-500" />
            <h2 className="text-lg font-bold tracking-tight uppercase">New This Week</h2>
            <span className="text-[10px] uppercase tracking-wider text-emerald-500/80 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">
              Fresh
            </span>
            <span className="text-[10px] text-muted-foreground font-medium">· {products.length} items</span>
          </div>
          <Link to="/products?sort=newest" className="text-xs text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Mobile: horizontal scroll strip / Desktop: grid */}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide lg:grid lg:grid-cols-4 lg:overflow-visible lg:pb-0">
          {products.map((product) => {
            const store = product.stores as any;
            const category = product.categories as any;
            return (
              <div key={product.id} className="min-w-[160px] lg:min-w-0">
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
                />
              </div>
            );
          })}
        </div>
      </ScrollReveal>
    </section>
  );
}
