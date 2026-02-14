import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ShieldCheck, Award, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';
import { useSubscription } from '@/hooks/useSubscription';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

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

function PWARecentCard({ product }: { product: RecentProduct }) {
  const { formatPrice } = useCurrency();
  const { getMemberPrice, isEligibleForDiscount } = useSubscription();

  const isEligible = isEligibleForDiscount(product.category_id, product.is_resellable, product.stores?.eclipse_plus_discount_enabled);
  const memberPrice = isEligible ? getMemberPrice(product.price, product.category_id, product.is_resellable) : product.price;
  const hasMemberDiscount = isEligible && memberPrice < product.price;

  return (
    <Link
      to={`/products/${product.slug}`}
      className="block rounded-lg overflow-hidden border border-border bg-card active:scale-[0.98] transition-transform flex-1 min-w-0"
    >
      {/* Full-width image */}
      <div className="aspect-[4/3] relative overflow-hidden bg-muted">
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
            No image
          </div>
        )}
        {/* Store overlay */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 pt-6">
          <div className="flex items-center gap-1.5">
            {product.stores?.logo_url && (
              <img src={product.stores.logo_url} alt="" className="h-4 w-4 rounded object-contain bg-white/10" />
            )}
            <span className="text-white text-[11px] font-medium truncate">{product.stores?.name}</span>
            {product.stores?.is_verified && <ShieldCheck className="h-3 w-3 text-blue-400 flex-shrink-0" />}
            {product.stores?.is_trusted && <Award className="h-3 w-3 text-amber-400 flex-shrink-0" />}
          </div>
        </div>
      </div>
      {/* Info */}
      <div className="p-2.5">
        {product.categories?.name && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
            <Tag className="h-2.5 w-2.5" />
            {product.categories.name}
          </span>
        )}
        <h4 className="font-medium text-sm text-foreground line-clamp-1 mb-1">{product.name}</h4>
        {hasMemberDiscount ? (
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-amber-500">{formatPrice(memberPrice)}</span>
            <span className="text-[10px] text-muted-foreground line-through">{formatPrice(product.price)}</span>
          </div>
        ) : (
          <span className="text-sm font-bold text-foreground">{formatPrice(product.price)}</span>
        )}
      </div>
    </Link>
  );
}

export function PWARecentReleases() {
  const [pageIndex, setPageIndex] = useState(0);

  const { data: products, isLoading } = useQuery({
    queryKey: ['pwa-recent-releases'],
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

  const totalPages = products ? Math.ceil(products.length / 2) : 0;

  // Auto-rotate every 3 seconds
  useEffect(() => {
    if (!totalPages || totalPages <= 1) return;
    const timer = setInterval(() => {
      setPageIndex((prev) => (prev + 1) % totalPages);
    }, 3000);
    return () => clearInterval(timer);
  }, [totalPages]);

  const currentPair = products?.slice(pageIndex * 2, pageIndex * 2 + 2) || [];

  if (isLoading) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Recent Releases</h3>
        <div className="grid grid-cols-2 gap-2.5">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-lg overflow-hidden border border-border bg-card">
              <Skeleton className="aspect-[4/3]" />
              <div className="p-2.5 space-y-1.5">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!products?.length) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Recent Releases</h3>
        <Link to="/products" className="text-xs text-primary flex items-center gap-0.5">
          View all <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {/* 2-card grid that fills width */}
      <div className="grid grid-cols-2 gap-2.5">
        {currentPair.map((product) => (
          <PWARecentCard key={product.id} product={product} />
        ))}
        {/* If odd number, fill empty slot */}
        {currentPair.length === 1 && <div />}
      </div>

      {/* Page indicators */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPageIndex(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === pageIndex ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
