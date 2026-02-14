import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ShieldCheck, Award } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

interface RecentProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[] | null;
  created_at: string;
  stores: {
    name: string;
    slug: string;
    logo_url: string | null;
    is_verified: boolean;
    is_trusted: boolean;
  } | null;
}

export function RecentReleasesCarousel() {
  const { formatPrice } = useCurrency();
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
          id, name, slug, price, images, created_at,
          stores!inner (name, slug, logo_url, is_verified, is_trusted, is_active, is_testing)
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
        <h2 className="text-lg font-semibold mb-3">Recent Releases</h2>
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-44">
              <Skeleton className="aspect-[4/3] rounded-lg" />
              <Skeleton className="h-4 w-3/4 mt-2" />
              <Skeleton className="h-3 w-1/2 mt-1" />
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
        <h2 className="text-lg font-semibold">Recent Releases</h2>
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
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {products.map((product) => (
          <Link
            key={product.id}
            to={`/products/${product.slug}`}
            className="flex-shrink-0 w-44 group"
          >
            <div className="overflow-hidden rounded-lg border border-border bg-card hover:border-primary/30 transition-colors">
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
                {/* Store overlay */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                  <div className="flex items-center gap-1">
                    {product.stores?.logo_url && (
                      <img
                        src={product.stores.logo_url}
                        alt=""
                        className="h-3.5 w-3.5 rounded object-contain bg-white/10"
                      />
                    )}
                    <span className="text-white text-[10px] font-medium truncate">
                      {product.stores?.name}
                    </span>
                    {product.stores?.is_verified && <ShieldCheck className="h-2.5 w-2.5 text-blue-400 flex-shrink-0" />}
                    {product.stores?.is_trusted && <Award className="h-2.5 w-2.5 text-amber-400 flex-shrink-0" />}
                  </div>
                </div>
              </div>
              <div className="p-2">
                <h3 className="text-xs font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                  {product.name}
                </h3>
                <span className="text-xs font-bold text-foreground mt-0.5 block">
                  {formatPrice(product.price)}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
