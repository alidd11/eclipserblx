import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PrefetchLink as Link } from '@/components/PrefetchLink';
import { Skeleton } from '@/components/ui/skeleton';
import { Gift, ArrowRight } from 'lucide-react';
import { optimizeImageUrl } from '@/utils/optimizeImageUrl';
import { getFirstImageUrl } from '@/lib/mediaUtils';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { Button } from '@/components/ui/button';

export function FreeAssetsTeaser() {
  const { data: products, isLoading } = useQuery({
    queryKey: ['free-assets-teaser'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, slug, images, download_count, stores!inner(is_active)')
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
        <div className="p-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="border-l-2 border-primary pl-3">
                <h2 className="text-base sm:text-lg lg:text-xl font-bold tracking-tight uppercase">Free Assets</h2>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-emerald-400/80 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                No fees
              </span>
            </div>
            <Link to="/free" className="text-xs text-primary hover:underline flex items-center gap-1">
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide lg:grid lg:grid-cols-6 lg:overflow-visible lg:pb-0">
            {products.map((product) => {
              const imageUrl = getFirstImageUrl(product.images);
              return (
                <Link key={product.id} to={`/product/${product.slug}`} className="block min-w-[120px] lg:min-w-0 group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted border border-border">
                    {imageUrl ? (
                      <img
                        src={optimizeImageUrl(imageUrl, 300)}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/50 gap-1.5">
                        <Gift className="h-6 w-6" />
                        <span className="text-[10px] font-medium">Free</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-medium mt-1.5 truncate group-hover:text-primary transition-colors">{product.name}</p>
                  <p className="text-[10px] text-primary font-semibold">Free</p>
                </Link>
              );
            })}
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
