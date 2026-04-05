import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PrefetchLink as Link } from '@/components/PrefetchLink';
import { ArrowRight, Star } from 'lucide-react';
import { ProductCard } from '@/components/ui/ProductCard';
import { ProductCardSkeleton } from '@/components/ui/ProductCardSkeleton';
import { getFirstImageUrl } from '@/lib/mediaUtils';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { Skeleton } from '@/components/ui/skeleton';

export function TopStoresSection() {
  const { data: stores, isLoading } = useQuery({
    queryKey: ['top-stores-home'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, slug, logo_url, is_verified, follower_count, product_count, description')
        .eq('is_active', true)
        .order('follower_count', { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (!stores?.length) return null;

  return (
    <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <ScrollReveal direction="up" distance={16} duration={0.35}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Star className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight uppercase">Top Stores</h2>
          </div>
          <Link to="/stores" className="text-xs text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {stores.map((store) => (
            <Link
              key={store.id}
              to={`/store/${store.slug}`}
              className="group flex flex-col items-center p-4 rounded-xl border border-border/50 bg-card/30 hover:border-primary/30 hover:bg-card/60 transition-all"
            >
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden mb-2">
                {store.logo_url ? (
                  <img src={store.logo_url} alt={store.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-muted-foreground">
                    {store.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold truncate max-w-full text-center">
                {store.name}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {store.product_count || 0} products
              </p>
            </Link>
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}
