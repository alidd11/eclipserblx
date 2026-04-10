import { useState, useEffect, useCallback } from 'react';
import { PrefetchLink as Link } from '@/components/PrefetchLink';
import { ShieldCheck, Award, ChevronRight, Users, Package, Megaphone } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STORE_LISTING_COLUMNS } from '@/lib/storeColumns';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface FeaturedStore {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  accent_color: string | null;
  is_verified: boolean;
  follower_count: number | null;
  average_rating: number | null;
  product_count: number | null;
  isPromoted?: boolean;
}

function usePromotedSpotlightStore() {
  return useQuery({
    queryKey: ['pwa-store-spotlight-promotion'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('product_promotions_public' as any)
        .select('id, store_id') as any)
        .eq('goal', 'store_spotlight')
        .limit(1);

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const { data: storeData } = await (supabase
        .from('stores_public' as any)
        .select('id, name, slug, description, logo_url, banner_url, accent_color, is_verified, follower_count, average_rating, product_count, status, is_active, is_testing') as any)
        .eq('id', data[0].store_id)
        .maybeSingle();

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const s = data[0].stores as any;
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
        follower_count: s.follower_count,
        average_rating: s.average_rating,
        product_count: s.product_count,
        isPromoted: true,
      } as FeaturedStore;
    },
    staleTime: 1000 * 60 * 2,
  });
}

function useAlgorithmicStores(excludeStoreId?: string | null) {
  return useQuery({
    queryKey: ['pwa-featured-stores', excludeStoreId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select(STORE_LISTING_COLUMNS)
        .eq('is_active', true)
        .eq('is_testing', false)
        .order('created_at', { ascending: false })
        .limit(8);
      if (error) throw error;
      let stores = data as FeaturedStore[];
      if (excludeStoreId) {
        stores = stores.filter(s => s.id !== excludeStoreId);
      }
      const scored = stores.map(store => ({
        ...store,
        score: Math.random() * 100
      }));
      return scored.sort((a, b) => b.score - a.score).slice(0, 7);
    },
    staleTime: 1000 * 60 * 2,
  });
}

function SpotlightStoreCard({ store }: { store: FeaturedStore }) {
  const { t } = useTranslation();
  const accentStyle = store.accent_color
    ? { borderColor: store.accent_color }
    : undefined;

  return (
    <Link
      to={`/store/${store.slug}`}
      className="group relative block rounded-lg overflow-hidden border bg-card transition-all duration-300"
      style={accentStyle}
    >
      {/* Cinematic Banner */}
      <div className="relative h-40 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500"
          style={{
            backgroundImage: store.banner_url
              ? `url(${store.banner_url})`
              : 'linear-gradient(135deg, hsl(var(--muted)), hsl(var(--muted-foreground) / 0.2))'
          }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />

        {/* Badges top-right */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {store.is_verified && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500 text-foreground text-[10px] font-semibold shadow" title="This seller has completed our identity and business verification process">
              <ShieldCheck className="h-3 w-3" />{t('landing.verified')} Seller
            </span>
          )}
        </div>

        {/* Logo + Store info overlaid at bottom */}
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 flex items-end gap-3">
          <div className="w-12 h-12 rounded-lg bg-card border-2 border-white/20 overflow-hidden shadow-lg flex-shrink-0">
            {store.logo_url ? (
              <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-base font-bold bg-muted text-muted-foreground">
                {store.name.charAt(0)}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-base text-foreground truncate leading-tight">{store.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              {(store.follower_count ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-[11px] text-foreground/60">
                  <Users className="h-3 w-3" />{store.follower_count}
                </span>
              )}
              {(store.product_count ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-[11px] text-foreground/60">
                  <Package className="h-3 w-3" />{store.product_count} products
                </span>
              )}
              {store.average_rating ? (
                <span className="text-[11px] text-foreground/60">
                  <span className="text-amber-400">★</span> {store.average_rating.toFixed(1)}
                </span>
              ) : null}
            </div>
          </div>
          <span className="flex items-center gap-0.5 text-[11px] text-foreground/80 font-medium group-hover:text-foreground transition-colors flex-shrink-0">
            {t('landing.viewStore')}<ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function CompactStoreCard({ store }: { store: FeaturedStore }) {
  const accentBorder = store.accent_color ? { borderColor: store.accent_color } : undefined;

  return (
    <Link
      to={`/store/${store.slug}`}
      className="group block rounded-lg overflow-hidden border bg-card transition-colors hover:border-primary/30"
      style={accentBorder}
    >
      {/* Mini banner */}
      <div className="relative h-16 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500"
          style={{
            backgroundImage: store.banner_url
              ? `url(${store.banner_url})`
              : 'linear-gradient(135deg, hsl(var(--muted)), hsl(var(--muted-foreground) / 0.2))'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        {/* Badges */}
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
          {store.is_verified && <ShieldCheck className="h-3 w-3 text-blue-400" />}
        </div>
        {/* Logo + name overlaid */}
        <div className="absolute bottom-1.5 left-2 right-2 flex items-end gap-2">
          <div className="w-7 h-7 rounded bg-card border border-card overflow-hidden shadow-sm flex-shrink-0">
            {store.logo_url ? (
              <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] font-bold bg-muted text-muted-foreground">
                {store.name.charAt(0)}
              </div>
            )}
          </div>
          <h4 className="font-medium text-xs text-foreground truncate pb-0.5">{store.name}</h4>
        </div>
      </div>
      {/* Stats */}
      <div className="px-2 py-1.5 flex items-center gap-2">
        {(store.follower_count ?? 0) > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <Users className="h-2.5 w-2.5" />{store.follower_count}
          </span>
        )}
        {(store.product_count ?? 0) > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <Package className="h-2.5 w-2.5" />{store.product_count}
          </span>
        )}
      </div>
    </Link>
  );
}

function StoreSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <Skeleton className="h-24 rounded-none" />
      <div className="px-2.5 py-2 space-y-1.5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

function CompactStoreSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <Skeleton className="h-16 rounded-none" />
      <div className="px-2 py-1.5">
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

export function PWAFeaturedStores() {
  const { t } = useTranslation();
  const { data: promotedStore } = usePromotedSpotlightStore();
  const { data: stores, isLoading } = useAlgorithmicStores(promotedStore?.id);

  const spotlightStore = promotedStore || stores?.[0];
  const listStores = promotedStore ? stores?.slice(0, 6) : stores?.slice(1, 7);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('landing.featuredStores')}</h3>
        <Link to="/stores" className="text-[10px] font-bold uppercase tracking-wider text-primary hover:underline flex items-center gap-0.5">
          {t('landing.viewAll')}
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <StoreSkeleton />
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <CompactStoreSkeleton key={i} />
            ))}
          </div>
        </div>
      ) : stores?.length ? (
        <div className="space-y-2">
          {/* Spotlight: top store */}
          {spotlightStore && <SpotlightStoreCard store={spotlightStore} />}
          {/* Grid for remaining stores */}
          {listStores?.length ? (
            <div className="grid grid-cols-2 gap-2">
              {listStores.map((store) => (
                <CompactStoreCard key={store.id} store={store} />
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          {t('landing.noStoresAvailable')}
        </p>
      )}
    </div>
  );
}
