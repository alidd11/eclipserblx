import { forwardRef, useEffect, useRef } from 'react';
import { PrefetchLink as Link } from '@/components/PrefetchLink';
import { useQuery } from '@tanstack/react-query';
import { Store, ShieldCheck, Award, ChevronRight, Megaphone, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { optimizeImageUrl } from '@/utils/optimizeImageUrl';

interface TopStore {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  accent_color: string | null;
  is_verified: boolean;
  is_trusted: boolean;
  follower_count: number;
  isPromoted?: boolean;
}

export const TopStoresSection = forwardRef<HTMLDivElement>(function TopStoresSection(_props, ref) {
  // First try to find an active store_spotlight promotion winner
  const { data: promotedStore } = useQuery({
    queryKey: ['store-spotlight-promotion'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('product_promotions_public' as any)
        .select('id, store_id') as any)
        .eq('goal', 'store_spotlight')
        .limit(1);
      
      if (error) throw error;
      if (!data || data.length === 0) return null;

      // Fetch store details separately from the safe public view
      const { data: storeData } = await (supabase
        .from('stores_public' as any)
        .select('id, name, slug, description, logo_url, banner_url, accent_color, is_verified, is_trusted, follower_count, status, is_active, is_testing') as any)
        .eq('id', data[0].store_id)
        .maybeSingle();

      if (!storeData || storeData.status !== 'approved' || !storeData.is_active || storeData.is_testing) return null;

      return {
        id: storeData.id,
        name: storeData.name,
        slug: storeData.slug,
        description: storeData.description,
        logo_url: storeData.logo_url,
        banner_url: storeData.banner_url,
        accent_color: storeData.accent_color,
        is_verified: storeData.is_verified,
        is_trusted: storeData.is_trusted,
        follower_count: storeData.follower_count,
        isPromoted: true,
        promotionId: data[0].id,
      } as TopStore & { promotionId: string };
    },
  });

  // Fallback: algorithmic selection (small sellers first)
  const { data: fallbackStores, isLoading } = useQuery({
    queryKey: ['top-stores-featured'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('stores_public' as any)
        .select('id, name, slug, description, logo_url, banner_url, accent_color, is_verified, is_trusted, follower_count') as any)
        .eq('status', 'approved')
        .eq('is_active', true)
        .eq('is_testing', false)
        .gt('product_count', 0)
        .order('is_trusted', { ascending: true })
        .order('is_verified', { ascending: true })
        .order('follower_count', { ascending: true })
        .limit(1);
      
      if (error) throw error;
      return data as TopStore[];
    },
    enabled: !promotedStore,
  });

  const store = promotedStore || fallbackStores?.[0];
  const isPromoted = !!(promotedStore);

  // Track impression for promoted store
  const impressionTracked = useRef(false);
  useEffect(() => {
    const promoId = (promotedStore as any)?.promotionId;
    if (!promoId || impressionTracked.current) return;
    impressionTracked.current = true;

    const today = new Date().toISOString().split('T')[0];
    supabase.rpc('increment_promotion_impression', {
      p_promotion_id: promoId,
      p_date: today,
    }).then(() => {}, () => {});
  }, [promotedStore]);

  if (!isLoading && !store) return null;

  if (isLoading && !store) {
    return (
      <div className="col-span-full">
        <Skeleton className="h-[72px] w-full rounded-lg" />
      </div>
    );
  }

  const accentColor = store!.accent_color || 'hsl(var(--primary))';

  return (
    <div ref={ref} className="col-span-full">
      <Link to={`/store/${store!.slug}`} className="group block">
        <div className="relative flex items-center gap-3 rounded-lg border border-border bg-card overflow-hidden hover:border-primary/40 transition-colors duration-200 px-3 py-2.5">
          {/* Banner background */}
          {store!.banner_url ? (
            <div className="absolute inset-0 pointer-events-none">
              <img
                src={optimizeImageUrl(store!.banner_url, 800, 80)}
                alt=""
                className="w-full h-full object-cover opacity-15"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-card via-card/80 to-transparent" />
            </div>
          ) : (
            <div 
              className="absolute inset-0 opacity-[0.07] pointer-events-none"
              style={{ background: `linear-gradient(135deg, ${accentColor}, transparent 60%)` }}
            />
          )}

          {/* Store logo */}
          <div className="relative flex-shrink-0">
            {store!.logo_url ? (
              <img
                src={optimizeImageUrl(store!.logo_url, 40, 40, 'contain')}
                alt={store!.name}
                width={40}
                height={40}
                loading="lazy"
                decoding="async"
                className="h-10 w-10 rounded-lg object-contain bg-muted border border-border p-0.5"
              />
            ) : (
              <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-muted border border-border">
                <Store className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Store info */}
          <div className="relative flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {store!.name}
              </h3>
              {store!.is_verified && (
                <ShieldCheck className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              )}
              {store!.is_trusted && (
                <Award className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              {store!.description && (
                <p className="text-[11px] text-muted-foreground line-clamp-1 max-w-xs">
                  {store!.description}
                </p>
              )}
            </div>
          </div>

          {/* Right side: badges + followers */}
          <div className="relative flex items-center gap-2.5 flex-shrink-0">
            {isPromoted && (
              <Badge className="text-[10px] px-1.5 py-0.5 gap-0.5 bg-primary/10 text-primary border-primary/20 hidden sm:inline-flex">
                <Megaphone className="h-2.5 w-2.5" />
                Promoted
              </Badge>
            )}
            {!isPromoted && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 hidden sm:inline-flex">
                Featured
              </Badge>
            )}
            <span className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground">
              <Users className="h-3 w-3" />
              {store!.follower_count.toLocaleString()}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </Link>
    </div>
  );
});
