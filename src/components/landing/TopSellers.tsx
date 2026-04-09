import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PrefetchLink as Link } from '@/components/PrefetchLink';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, ArrowRight, BadgeCheck, Shield } from 'lucide-react';
import { optimizeImageUrl } from '@/utils/optimizeImageUrl';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

export function TopSellers() {
  const { data: stores, isLoading } = useQuery({
    queryKey: ['top-creators-home'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, slug, logo_url, is_verified, is_trusted, follower_count')
        .eq('is_active', true)
        .order('follower_count', { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <Skeleton className="h-6 w-44 mb-4" />
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-32 rounded-full" />
          ))}
        </div>
      </section>
    );
  }

  if (!stores?.length) return null;

  return (
    <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      <ScrollReveal direction="up" distance={16} duration={0.35}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/10">
              <Trophy className="h-4 w-4 text-amber-500" />
            </div>
            <h2 className="text-base sm:text-lg lg:text-xl font-bold tracking-tight uppercase">Top Creators</h2>
          </div>
          <Link to="/stores" className="text-sm text-foreground hover:text-primary hover:underline flex items-center gap-1">
            All stores <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Mobile: horizontal scroll of compact pills / Desktop: grid */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide lg:grid lg:grid-cols-4 lg:gap-3 lg:overflow-visible lg:pb-0">
          {stores.map((store, i) => (
            <Link key={store.id} to={`/store/${store.slug}`} className="block group flex-shrink-0 lg:flex-shrink">
              {/* Mobile: compact pill */}
              <div className="lg:hidden flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 hover:border-primary/40 transition-colors">
                <div className="relative h-7 w-7 rounded-full overflow-hidden bg-muted border border-border flex-shrink-0">
                  {i < 3 && (
                    <div className={`absolute -top-0.5 -right-0.5 z-10 h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold text-foreground shadow-sm ${
                      i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : 'bg-amber-700'
                    }`}>
                      {i + 1}
                    </div>
                  )}
                  {store.logo_url ? (
                    <img src={optimizeImageUrl(store.logo_url, 56)} alt={store.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px] font-bold">
                      {store.name.charAt(0)}
                    </div>
                  )}
                </div>
                <span className="text-xs font-semibold truncate max-w-[80px] group-hover:text-primary transition-colors">{store.name}</span>
                {store.is_verified && <BadgeCheck className="h-3 w-3 text-blue-400 flex-shrink-0" />}
                {store.is_trusted && <Shield className="h-3 w-3 text-amber-400 flex-shrink-0" />}
              </div>

              {/* Desktop: card layout */}
              <div className="hidden lg:block rounded-lg border border-border bg-card p-4 hover:border-primary/40 hover:shadow-primary/5 transition-all duration-200">
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 rounded-full overflow-hidden bg-muted border-2 border-border flex-shrink-0">
                    {i < 3 && (
                      <div className={`absolute -top-1 -right-1 z-10 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-foreground shadow-md ${
                        i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : 'bg-amber-700'
                      }`}>
                        {i + 1}
                      </div>
                    )}
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
                      <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{store.name}</p>
                      {store.is_verified && <BadgeCheck className="h-3 w-3 text-blue-400 flex-shrink-0" />}
                      {store.is_trusted && <Shield className="h-3 w-3 text-amber-400 flex-shrink-0" />}
                    </div>
                    <span className="text-xs text-muted-foreground">{store.follower_count ?? 0} followers</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}
