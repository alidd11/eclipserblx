import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PrefetchLink as Link } from '@/components/PrefetchLink';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, ArrowRight, ShieldCheck, Award } from 'lucide-react';
import { optimizeImageUrl } from '@/utils/optimizeImageUrl';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

export function FeaturedCreators() {
  const { data: stores, isLoading } = useQuery({
    queryKey: ['featured-creators-home'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, slug, logo_url, banner_url, accent_color, is_verified, follower_count')
        .eq('is_active', true)
        .eq('is_verified', true)
        .order('follower_count', { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Skeleton className="h-6 w-44 mb-4" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="min-w-[160px] h-24 rounded-lg" />
          ))}
        </div>
      </section>
    );
  }

  if (!stores?.length) return null;

  return (
    <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <ScrollReveal direction="up" distance={16} duration={0.35}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight uppercase">Featured Creators</h2>
          </div>
          <Link to="/stores" className="text-sm text-foreground hover:text-primary hover:underline flex items-center gap-1">
            All stores <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide lg:grid lg:grid-cols-4 lg:overflow-visible lg:pb-0">
          {stores.map((store, i) => (
            <ScrollReveal key={store.id} delay={i * 0.04} direction="up" distance={10} duration={0.25}>
              <Link to={`/store/${store.slug}`} className="block min-w-[180px] lg:min-w-0 group">
                <div className="rounded-lg border border-border bg-card p-3 hover:border-primary/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full overflow-hidden bg-muted border border-border flex-shrink-0">
                      {store.logo_url ? (
                        <img src={optimizeImageUrl(store.logo_url, 80)} alt={store.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm font-bold">
                          {store.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-semibold truncate">{store.name}</p>
                        {store.is_verified && <ShieldCheck className="h-3 w-3 text-primary flex-shrink-0" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {store.follower_count ?? 0} followers
                      </p>
                    </div>
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
