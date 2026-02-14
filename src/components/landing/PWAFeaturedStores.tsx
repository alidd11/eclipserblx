import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Award, ChevronRight, Users, Package } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
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
  is_trusted: boolean;
  follower_count: number | null;
  average_rating: number | null;
  product_count: number | null;
}

function useAlgorithmicStores() {
  return useQuery({
    queryKey: ['pwa-featured-stores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select(STORE_LISTING_COLUMNS)
        .eq('is_active', true)
        .eq('is_testing', false)
        .order('is_trusted', { ascending: false })
        .order('is_verified', { ascending: false })
        .order('follower_count', { ascending: false, nullsFirst: false })
        .limit(8);
      if (error) throw error;
      const stores = data as FeaturedStore[];
      const scored = stores.map(store => ({
        ...store,
        score:
          (store.is_trusted ? 10 : 50) +
          (store.is_verified ? 5 : 30) +
          Math.max(0, 100 - (store.follower_count || 0) * 0.5) +
          (store.average_rating || 0) * 5 +
          Math.random() * 40
      }));
      return scored.sort((a, b) => b.score - a.score).slice(0, 7);
    },
    staleTime: 1000 * 60 * 2,
  });
}

function SpotlightStoreCard({ store }: { store: FeaturedStore }) {
  const { t } = useTranslation();
  const accentBorder = store.accent_color ? { borderColor: store.accent_color } : undefined;

  return (
    <Link
      to={`/store/${store.slug}`}
      className="group relative block rounded-lg overflow-hidden border bg-card transition-all duration-300 hover:shadow-lg active:scale-[0.99]"
      style={accentBorder}
    >
      {/* Banner */}
      <div className="relative h-24 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
          style={{
            backgroundImage: store.banner_url
              ? `url(${store.banner_url})`
              : 'linear-gradient(135deg, hsl(var(--muted)), hsl(var(--muted-foreground) / 0.2))'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        {/* Badges */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
          {store.is_trusted && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-medium">
              <Award className="h-3 w-3" />{t('landing.trusted')}
            </span>
          )}
          {store.is_verified && !store.is_trusted && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-medium">
              <ShieldCheck className="h-3 w-3" />{t('landing.verified')}
            </span>
          )}
        </div>
        {/* Logo + name overlaid on banner */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-end gap-2.5">
          <div className="w-10 h-10 rounded-lg bg-card border-2 border-card overflow-hidden shadow-md flex-shrink-0">
            {store.logo_url ? (
              <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm font-bold bg-muted text-muted-foreground">
                {store.name.charAt(0)}
              </div>
            )}
          </div>
          <div className="min-w-0 pb-0.5">
            <h3 className="font-semibold text-sm text-white truncate">{store.name}</h3>
            {store.average_rating ? (
              <span className="text-xs text-white/70">
                <span className="text-amber-400">★</span> {store.average_rating.toFixed(1)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <div className="px-2.5 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {(store.follower_count ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Users className="h-2.5 w-2.5" />{store.follower_count}
              </span>
            )}
            {(store.product_count ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Package className="h-2.5 w-2.5" />{store.product_count}
              </span>
            )}
          </div>
          <span className="flex items-center text-[11px] text-primary font-medium group-hover:underline">
            {t('landing.viewStore')}<ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
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
      className="group block rounded-lg overflow-hidden border bg-card transition-colors hover:border-primary/30 active:scale-[0.98]"
      style={accentBorder}
    >
      {/* Mini banner */}
      <div className="relative h-16 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
          style={{
            backgroundImage: store.banner_url
              ? `url(${store.banner_url})`
              : 'linear-gradient(135deg, hsl(var(--muted)), hsl(var(--muted-foreground) / 0.2))'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        {/* Badges */}
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
          {store.is_trusted && <Award className="h-3 w-3 text-amber-400" />}
          {store.is_verified && !store.is_trusted && <ShieldCheck className="h-3 w-3 text-blue-400" />}
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
          <h4 className="font-medium text-xs text-white truncate pb-0.5">{store.name}</h4>
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
  const { data: stores, isLoading } = useAlgorithmicStores();

  const spotlightStore = stores?.[0];
  const listStores = stores?.slice(1, 7);

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
