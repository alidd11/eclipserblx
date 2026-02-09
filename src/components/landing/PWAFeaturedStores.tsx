import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Award, ChevronRight } from 'lucide-react';
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
  is_verified: boolean;
  is_trusted: boolean;
  follower_count: number | null;
  average_rating: number | null;
}

const SLIDE_INTERVAL = 8000;

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
          (store.is_trusted ? 100 : 0) +
          (store.is_verified ? 50 : 0) +
          (store.follower_count || 0) * 0.1 +
          (store.average_rating || 0) * 10 +
          Math.random() * 20
      }));
      return scored.sort((a, b) => b.score - a.score).slice(0, 6);
    },
    staleTime: 1000 * 60 * 2,
  });
}

function StoreCard({ store }: { store: FeaturedStore }) {
  const { t } = useTranslation();
  
  return (
    <Link 
      to={`/store/${store.slug}`}
      className="group relative block rounded-2xl overflow-hidden border border-primary/10 bg-gradient-to-br from-card via-card to-primary/5 transition-all duration-300 hover:border-primary/30 hover:shadow-lg active:scale-[0.98]"
    >
      <div className="relative h-24 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
          style={{
            backgroundImage: store.banner_url 
              ? `url(${store.banner_url})` 
              : 'linear-gradient(135deg, hsl(var(--primary)/0.2), hsl(var(--muted)))'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {store.is_trusted && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/90 text-white text-[10px] font-medium backdrop-blur-sm">
              <Award className="h-3 w-3" />
              {t('landing.trusted')}
            </span>
          )}
          {store.is_verified && !store.is_trusted && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/90 text-white text-[10px] font-medium backdrop-blur-sm">
              <ShieldCheck className="h-3 w-3" />
              {t('landing.verified')}
            </span>
          )}
        </div>
      </div>
      <div className="relative px-4 pb-4 -mt-6">
        <div className="w-14 h-14 rounded-xl bg-card border-2 border-card overflow-hidden shadow-lg mb-3">
          {store.logo_url ? (
            <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xl font-bold bg-muted text-muted-foreground">
              {store.name.charAt(0)}
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-base text-foreground truncate pr-2">{store.name}</h3>
            {store.average_rating && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                <span className="text-amber-500">★</span>
                {store.average_rating.toFixed(1)}
              </span>
            )}
          </div>
          {store.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{store.description}</p>
          )}
        </div>
        <div className="flex items-center justify-end mt-3 text-xs text-primary font-medium">
          <span className="group-hover:underline">{t('landing.viewStore')}</span>
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}

function StoreSkeleton() {
  return (
    <div className="rounded-2xl border border-primary/10 bg-gradient-to-br from-card via-card to-primary/5 overflow-hidden">
      <Skeleton className="h-24 rounded-none" />
      <div className="px-4 pb-4 -mt-6 relative">
        <Skeleton className="w-14 h-14 rounded-xl mb-3" />
        <Skeleton className="h-5 w-32 mb-2" />
        <Skeleton className="h-3 w-full mb-1" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  );
}

export function PWAFeaturedStores() {
  const { t } = useTranslation();
  const { data: stores, isLoading } = useAlgorithmicStores();
  const [currentSlide, setCurrentSlide] = useState(0);

  const totalSlides = stores?.length || 0;

  const goToNext = useCallback(() => {
    if (totalSlides > 1) {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }
  }, [totalSlides]);

  useEffect(() => {
    if (totalSlides <= 1) return;
    const interval = setInterval(goToNext, SLIDE_INTERVAL);
    return () => clearInterval(interval);
  }, [totalSlides, goToNext]);

  const currentStore = stores?.[currentSlide];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{t('landing.featuredStores')}</h3>
        <Link to="/stores" className="text-xs text-primary hover:underline flex items-center gap-0.5">
          {t('landing.viewAll')}
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      
      <div className="relative overflow-hidden">
        {isLoading ? (
          <StoreSkeleton />
        ) : currentStore ? (
          <div key={currentStore.id} className="animate-fade-in">
            <StoreCard store={currentStore} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('landing.noStoresAvailable')}
          </p>
        )}
      </div>

      {totalSlides > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-1">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === currentSlide ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"
              )}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
