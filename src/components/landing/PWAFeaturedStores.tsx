import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Award, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STORE_LISTING_COLUMNS } from '@/lib/storeColumns';
import { cn } from '@/lib/utils';

interface FeaturedStore {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  banner_url: string | null;
  is_verified: boolean;
  is_trusted: boolean;
  follower_count: number | null;
  average_rating: number | null;
}

const SLIDE_INTERVAL = 8000; // 8 seconds

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
      
      return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, 6);
    },
    staleTime: 1000 * 60 * 2,
  });
}

function StoreCard({ store }: { store: FeaturedStore }) {
  return (
    <Link 
      to={`/stores/${store.slug}`}
      className="flex items-center gap-3 p-3 rounded-xl bg-card/50 border border-border hover:border-primary/30 transition-all active:scale-[0.98]"
    >
      <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
        {store.logo_url ? (
          <img 
            src={store.logo_url} 
            alt={store.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-lg font-bold text-muted-foreground">
            {store.name.charAt(0)}
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-sm truncate">{store.name}</span>
          {store.is_verified && (
            <ShieldCheck className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
          )}
          {store.is_trusted && (
            <Award className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
          )}
        </div>
        {store.average_rating && (
          <span className="text-xs text-muted-foreground">
            ⭐ {store.average_rating.toFixed(1)}
          </span>
        )}
      </div>
      
      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    </Link>
  );
}

function StoreSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-card/50 border border-border">
      <Skeleton className="w-12 h-12 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

export function PWAFeaturedStores() {
  const { data: stores, isLoading } = useAlgorithmicStores();
  const [currentSlide, setCurrentSlide] = useState(0);

  const storesPerSlide = 2;
  const totalSlides = stores ? Math.ceil(stores.length / storesPerSlide) : 0;

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

  const currentStores = stores?.slice(
    currentSlide * storesPerSlide,
    currentSlide * storesPerSlide + storesPerSlide
  ) || [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Featured Stores</h3>
        <Link 
          to="/stores" 
          className="text-xs text-primary hover:underline flex items-center gap-0.5"
        >
          View all
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      
      <div className="relative overflow-hidden">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <StoreSkeleton key={i} />
            ))}
          </div>
        ) : stores?.length ? (
          <div className="grid grid-cols-1 gap-2 transition-opacity duration-300">
            {currentStores.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No stores available
          </p>
        )}
      </div>

      {/* Slide indicators */}
      {totalSlides > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-1">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === currentSlide
                  ? "w-4 bg-primary"
                  : "w-1.5 bg-muted-foreground/30"
              )}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
