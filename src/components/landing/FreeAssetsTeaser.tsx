import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PrefetchLink as Link } from '@/components/PrefetchLink';
import { Skeleton } from '@/components/ui/skeleton';
import { Gift, ArrowRight } from 'lucide-react';
import { getFirstImageUrl } from '@/lib/mediaUtils';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { Button } from '@/components/ui/button';

export function FreeAssetsTeaser() {
  const { data: products, isLoading } = useQuery({
    queryKey: ['free-assets-teaser'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, slug, product_number, images, download_count, stores!inner(is_active)')
        .eq('is_active', true)
        .eq('moderation_status', 'approved')
        .eq('stores.is_active', true)
        .eq('price', 0)
        .order('download_count', { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Skeleton className="h-6 w-36 mb-4" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="min-w-[140px] aspect-square rounded-lg" />
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
              No fees, no catch
            </span>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight text-foreground">
              Free assets
            </h2>
          </div>
          <Link
            to="/free"
            className="shrink-0 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 uppercase tracking-widest font-semibold"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide lg:grid lg:grid-cols-6 lg:overflow-visible lg:pb-0">
          {products.map((product) => {
            const imageUrl = getFirstImageUrl(product.images, 360, 360, 'contain');
            return (
              <Link key={product.id} to={`/products/${(product as any).product_number ?? product.slug}`} className="block min-w-[160px] lg:min-w-0 group">
                <div className="aspect-[4/5] sm:aspect-square rounded-lg overflow-hidden bg-muted border border-border/60 group-hover:border-primary/40 transition-colors">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={product.name}
                      className="w-full h-full object-contain object-center"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/50 gap-1.5">
                      <Gift className="h-6 w-6" />
                      <span className="text-[10px] font-medium">Free</span>
                    </div>
                  )}
                </div>
                <p className="text-xs font-medium mt-2 truncate group-hover:text-primary transition-colors">{product.name}</p>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">Free</p>
              </Link>
            );
          })}
        </div>
      </ScrollReveal>
    </section>
  );
}
