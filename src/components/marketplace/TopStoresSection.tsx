import { forwardRef, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Store, ShieldCheck, Award, ChevronRight, Megaphone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
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
      const { data, error } = await supabase
        .from('product_promotions')
        .select(`
          id,
          store_id,
          stores!product_promotions_store_id_fkey (
            id, name, slug, description, logo_url, banner_url, accent_color,
            is_verified, is_trusted, follower_count, status, is_active, is_testing
          )
        `)
        .eq('slot_type', 'store_spotlight')
        .eq('status', 'active')
        .order('current_bid', { ascending: false })
        .limit(1);

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const promo = data[0];
      const s = promo.stores as any;
      if (!s || s.status !== 'approved' || !s.is_active || s.is_testing) return null;

      return {
        id: s.id,
        name: s.name,
        slug: s.slug,
        description: s.description,
        logo_url: s.logo_url,
        banner_url: s.banner_url,
        accent_color: s.accent_color,
        is_verified: s.is_verified,
        is_trusted: s.is_trusted,
        follower_count: s.follower_count,
        isPromoted: true,
        promotionId: promo.id,
      } as TopStore & { promotionId: string };
    },
  });

  // Fallback: algorithmic selection (small sellers first)
  const { data: fallbackStores, isLoading } = useQuery({
    queryKey: ['top-stores-featured'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, slug, description, logo_url, banner_url, accent_color, is_verified, is_trusted, follower_count')
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
    // Only run fallback if no promoted store
    enabled: !promotedStore,
  });

  const store = promotedStore || fallbackStores?.[0];
  const isPromoted = !!(promotedStore);

  // Track impression for promoted store (fire-and-forget, atomic)
  const impressionTracked = useRef(false);
  useEffect(() => {
    const promoId = (promotedStore as any)?.promotionId;
    if (!promoId || impressionTracked.current) return;
    impressionTracked.current = true;

    const today = new Date().toISOString().split('T')[0];
    supabase.rpc('increment_promotion_impression', {
      p_promotion_id: promoId,
      p_date: today,
    }).then(() => {}, () => { /* silently ignore analytics errors */ });
  }, [promotedStore]);

  if (!isLoading && !store) {
    return null;
  }

  if (isLoading && !store) {
    return (
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Featured Store</h2>
        <Skeleton className="w-full aspect-[16/9] rounded-xl" />
      </section>
    );
  }

  const accentColor = store!.accent_color || 'hsl(var(--primary))';

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Featured Store</h2>
        <Link
          to="/stores"
          className="text-xs text-primary hover:underline flex items-center gap-0.5"
        >
          View all
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <Link to={`/store/${store!.slug}`} className="group block">
        <div
          className="relative w-full aspect-[3/1] rounded-xl overflow-hidden border border-border"
          style={{
            background: store!.banner_url
              ? `url(${store!.banner_url}) center/cover`
              : `linear-gradient(135deg, ${accentColor}40, ${accentColor}20)`,
          }}
        >
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          {/* Promoted badge */}
          {isPromoted && (
            <div className="absolute top-2 right-2 z-10">
              <Badge className="text-[10px] px-1.5 py-0.5 gap-0.5 bg-primary/90 text-primary-foreground border-0">
                <Megaphone className="h-2.5 w-2.5" />
                Promoted
              </Badge>
            </div>
          )}

          {/* Content */}
          <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-6">
            {/* Badges */}
            <div className="flex items-center gap-1.5 mb-2">
              {store!.is_trusted && (
                <Badge className="text-[10px] px-1.5 py-0.5 gap-0.5 bg-amber-500 text-white border-0">
                  <Award className="h-2.5 w-2.5" />
                  Trusted Seller
                </Badge>
              )}
              {store!.is_verified && !store!.is_trusted && (
                <Badge className="text-[10px] px-1.5 py-0.5 gap-0.5 bg-blue-500/80 text-white border-0">
                  <ShieldCheck className="h-2.5 w-2.5" />
                  Verified
                </Badge>
              )}
            </div>

            {/* Store info */}
            <div className="flex items-center gap-2.5 mb-2">
              {store!.logo_url ? (
                <img
                  src={store!.logo_url}
                  alt={store!.name}
                  className="h-10 w-10 rounded-lg object-contain bg-white/10 backdrop-blur-sm border border-white/20 flex-shrink-0"
                />
              ) : (
                <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-white/10 backdrop-blur-sm border border-white/20 flex-shrink-0">
                  <Store className="h-5 w-5 text-white" />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl font-bold text-white truncate group-hover:text-primary transition-colors">
                  {store!.name}
                </h3>
                {store!.description && (
                  <p className="text-xs text-white/70 line-clamp-1">{store!.description}</p>
                )}
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              className="w-fit text-xs"
              tabIndex={-1}
            >
              Visit Store
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      </Link>
    </section>
  );
});
