import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PrefetchLink as Link } from '@/components/PrefetchLink';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, ArrowRight, BadgeCheck, Shield } from 'lucide-react';
import { optimizeImageUrl } from '@/utils/optimizeImageUrl';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

export function TopSellers() {
  const { data: stores, isLoading } = useQuery({
    queryKey: ['top-sellers-month'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, slug, logo_url, is_verified, is_trusted, follower_count')
        .eq('is_active', true)
        .order('follower_count', { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <section className="px-4 sm:px-6 lg:px-8 py-6">
        <Skeleton className="h-6 w-44 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </section>
    );
  }

  if (!stores?.length) return null;

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-6">
      <ScrollReveal direction="up" distance={16} duration={0.35}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <h2 className="text-lg font-bold tracking-tight">Top Sellers</h2>
          </div>
          <Link to="/stores" className="text-xs text-primary hover:underline flex items-center gap-1">
            All stores <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {stores.map((store, i) => (
            <ScrollReveal key={store.id} delay={i * 0.04} direction="up" distance={10} duration={0.25}>
              <Link to={`/store/${store.slug}`} className="block group">
                <div className="rounded-lg border border-border bg-card p-3 hover:border-primary/40 transition-colors text-center">
                  <div className="relative mx-auto w-12 h-12 rounded-full overflow-hidden bg-muted border-2 border-border mb-2">
                    {i < 3 && (
                      <div className="absolute -top-1 -right-1 z-10 h-5 w-5 rounded-full bg-amber-500 flex items-center justify-center text-[9px] font-bold text-white shadow-sm">
                        {i + 1}
                      </div>
                    )}
                    {store.logo_url ? (
                      <img src={optimizeImageUrl(store.logo_url, 96)} alt={store.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-lg font-bold">
                        {store.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-semibold truncate group-hover:text-primary transition-colors">{store.name}</p>
                  <div className="flex items-center justify-center gap-1 mt-0.5">
                    {store.is_verified && <BadgeCheck className="h-3 w-3 text-blue-400" />}
                    {store.is_trusted && <Shield className="h-3 w-3 text-amber-400" />}
                    <span className="text-[10px] text-muted-foreground">{store.follower_count ?? 0} followers</span>
                  </div>
                </div>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}
