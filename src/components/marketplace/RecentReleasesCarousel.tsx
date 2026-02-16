import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ShieldCheck, Award, Tag } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';
import { useSubscription } from '@/hooks/useSubscription';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

interface RecentProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[] | null;
  created_at: string;
  category_id: string | null;
  is_resellable: boolean;
  
  categories: { name: string; slug: string } | null;
  stores: {
    name: string;
    slug: string;
    logo_url: string | null;
    is_verified: boolean;
    is_trusted: boolean;
    eclipse_plus_discount_enabled: boolean;
  } | null;
}

export function RecentReleasesCarousel() {
  const { formatPrice } = useCurrency();
  const { getMemberPrice, getDiscountPercent, isEligibleForDiscount } = useSubscription();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const { data: products, isLoading } = useQuery({
    queryKey: ['recent-releases'],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, slug, price, images, created_at, category_id, is_resellable,
          categories (name, slug),
          stores!inner (name, slug, logo_url, is_verified, is_trusted, is_active, is_testing, eclipse_plus_discount_enabled)
        `)
        .eq('is_active', true)
        .eq('stores.is_active', true)
        .eq('stores.is_testing', false)
        .not('store_id', 'is', null)
        .or(`release_at.is.null,release_at.lte.${now}`)
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) throw error;
      return data as unknown as RecentProduct[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState);
    return () => el.removeEventListener('scroll', updateScrollState);
  }, [products]);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Recent Releases</h2>
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[280px] sm:w-[300px]">
              <Skeleton className="aspect-[4/3] rounded-lg" />
              <div className="mt-2 space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!products?.length) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent Releases</h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {products.map((product) => {
          const isEligible = isEligibleForDiscount(product.category_id, product.is_resellable, product.stores?.eclipse_plus_discount_enabled);
          const memberPrice = isEligible ? getMemberPrice(product.price, product.category_id, product.is_resellable) : product.price;
          const hasMemberDiscount = isEligible && memberPrice < product.price;

          return (
            <Link
              key={product.id}
              to={`/products/${product.slug}`}
              className="flex-shrink-0 w-[280px] sm:w-[300px] group snap-start"
            >
              <div className="overflow-hidden rounded-lg border border-border bg-card hover:border-primary/30 transition-colors">
                {/* Large image area like ClearlyDev */}
                <div className="aspect-[4/3] relative overflow-hidden bg-muted">
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                      No image
                    </div>
                  )}
                  {/* Store overlay at bottom */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5 pt-8">
                    <div className="flex items-center gap-1.5">
                      {product.stores?.logo_url && (
                        <img
                          src={product.stores.logo_url}
                          alt=""
                          className="h-5 w-5 rounded object-contain bg-white/10"
                        />
                      )}
                      <span className="text-white text-xs font-medium truncate">
                        {product.stores?.name}
                      </span>
                      {product.stores?.is_verified && <ShieldCheck className="h-3 w-3 text-blue-400 flex-shrink-0" />}
                      {product.stores?.is_trusted && <Award className="h-3 w-3 text-amber-400 flex-shrink-0" />}
                    </div>
                  </div>
                </div>
                {/* Content area */}
                <div className="p-3">
                  {/* Category + Rating row */}
                  <div className="flex items-center justify-between mb-1.5">
                    {product.categories?.name ? (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Tag className="h-2.5 w-2.5" />
                        {product.categories.name}
                      </span>
                    ) : (
                      <span />
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors mb-1">
                    {product.name}
                  </h3>
                  {hasMemberDiscount ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-amber-500">{formatPrice(memberPrice)}</span>
                      <span className="text-xs text-muted-foreground line-through">{formatPrice(product.price)}</span>
                    </div>
                  ) : (
                    <span className="text-sm font-bold text-foreground">{formatPrice(product.price)}</span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
