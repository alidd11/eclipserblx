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
    banner_url: string | null;
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
      className="block rounded-lg overflow-hidden border border-border bg-card active:scale-[0.99] transition-transform animate-fade-in"
    >
      {/* Wide image */}
      <div className="aspect-[16/9] relative overflow-hidden bg-muted">
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
      </div>
      {/* Store banner strip */}
      <div
        className="h-8 relative flex items-center gap-1.5 px-2.5 overflow-hidden"
        style={product.stores?.banner_url ? {
          backgroundImage: `url(${product.stores.banner_url})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : undefined}
      >
        {product.stores?.banner_url && (
          <div className="absolute inset-0 bg-black/60" />
        )}
        {!product.stores?.banner_url && (
          <div className="absolute inset-0 bg-muted" />
        )}
        <div className="relative z-10 flex items-center gap-1.5 min-w-0">
          {product.stores?.logo_url && (
            <img src={product.stores.logo_url} alt="" className="h-4 w-4 rounded object-contain bg-white/10 flex-shrink-0" />
          )}
          <span className={cn("text-[11px] font-medium truncate", product.stores?.banner_url ? "text-white" : "text-foreground")}>{product.stores?.name}</span>
          {product.stores?.is_verified && <ShieldCheck className="h-3 w-3 text-blue-400 flex-shrink-0" />}
          {product.stores?.is_trusted && <Award className="h-3 w-3 text-amber-400 flex-shrink-0" />}
        </div>
      </div>
      {/* Info */}
      <div className="px-3 py-2.5 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          {product.categories?.name && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5">
              <Tag className="h-2.5 w-2.5" />
              {product.categories.name}
            </span>
          )}
          <h4 className="font-medium text-sm text-foreground truncate">{product.name}</h4>
        </div>
        <div className="flex-shrink-0">
          {hasMemberDiscount ? (
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-amber-500">{formatPrice(memberPrice)}</span>
              <span className="text-[10px] text-muted-foreground line-through">{formatPrice(product.price)}</span>
            </div>
          ) : (
            <span className="text-sm font-bold text-foreground">{formatPrice(product.price)}</span>
          )}
        </div>
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
          stores!inner (name, slug, logo_url, banner_url, is_verified, is_trusted, is_active, is_testing, eclipse_plus_discount_enabled)
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

  const totalProducts = products?.length || 0;

  // Auto-rotate every 3 seconds
  useEffect(() => {
    if (!totalProducts || totalProducts <= 1) return;
    const timer = setInterval(() => {
      setPageIndex((prev) => (prev + 1) % totalProducts);
    }, 3000);
    return () => clearInterval(timer);
  }, [totalProducts]);

  const currentProduct = products?.[pageIndex];

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent Releases</h3>
        </div>
        <div className="rounded-lg overflow-hidden border border-border bg-card">
          <Skeleton className="aspect-[16/9]" />
          <Skeleton className="h-8" />
          <div className="px-3 py-2.5 flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      </div>
    );
  }

  if (!products?.length) return null;

  return (
    <div>
      <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent Releases</h3>
        <Link to="/products" className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-0.5">
          View all <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Single card rotating */}
      {currentProduct && (
        <PWARecentCard key={currentProduct.id} product={currentProduct} />
      )}

      {/* Page indicators */}
      {totalProducts > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {Array.from({ length: totalProducts }).map((_, i) => (
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
