import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ShieldCheck, Award, Package, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';
import { useSubscription } from '@/hooks/useSubscription';
import { Skeleton } from '@/components/ui/skeleton';
import { useFeaturedProducts, ScoredProduct } from '@/hooks/useFeaturedProducts';

function SpotlightCard({ product }: { product: ScoredProduct }) {
  const { formatPrice } = useCurrency();
  const { getMemberPrice, getDiscountPercent, isEligibleForDiscount } = useSubscription();

  const isEligible = isEligibleForDiscount(product.category_id, product.is_resellable, product.stores?.eclipse_plus_discount_enabled);
  const memberPrice = isEligible ? getMemberPrice(product.price, product.category_id, product.is_resellable) : product.price;
  const discountPercent = getDiscountPercent(product.category_id, product.is_resellable);
  const hasMemberDiscount = isEligible && memberPrice < product.price;

  return (
    <Link to={`/products/${product.slug}`} className="group block">
      <div className="relative rounded-lg overflow-hidden border border-border bg-card hover:border-primary/30 transition-colors">
        <div className="aspect-[16/9] relative overflow-hidden bg-muted">
          {product.images?.[0] ? (
            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <Package className="h-8 w-8 text-muted-foreground/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-0 inset-x-0 p-3 sm:p-4">
            <h4 className="text-white font-bold text-sm sm:text-base line-clamp-1 group-hover:text-primary transition-colors">{product.name}</h4>
            <div className="flex items-center gap-2 mt-1">
              {hasMemberDiscount ? (
                <>
                  <span className="text-amber-500 font-bold text-sm">{formatPrice(memberPrice)}</span>
                  <span className="text-white/50 text-xs line-through">{formatPrice(product.price)}</span>
                  <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                    <Crown className="h-2.5 w-2.5" />
                    {discountPercent}%
                  </span>
                </>
              ) : (
                <span className="text-white font-bold text-sm">{formatPrice(product.price)}</span>
              )}
            </div>
          </div>
        </div>
        {/* Store strip */}
        <div className="h-7 flex items-center gap-1.5 px-2.5 bg-muted/60">
          {product.stores?.logo_url && (
            <img src={product.stores.logo_url} alt="" className="h-3.5 w-3.5 rounded-sm object-cover flex-shrink-0" />
          )}
          <span className="text-[10px] text-muted-foreground font-medium truncate">{product.stores?.name}</span>
          {product.stores?.is_verified && <ShieldCheck className="h-3 w-3 text-blue-400 flex-shrink-0" />}
          {product.stores?.is_trusted && <Award className="h-3 w-3 text-amber-400 flex-shrink-0" />}
        </div>
      </div>
    </Link>
  );
}

function GridCard({ product }: { product: ScoredProduct }) {
  const { formatPrice } = useCurrency();
  const { getMemberPrice, getDiscountPercent, isEligibleForDiscount } = useSubscription();

  const isEligible = isEligibleForDiscount(product.category_id, product.is_resellable, product.stores?.eclipse_plus_discount_enabled);
  const memberPrice = isEligible ? getMemberPrice(product.price, product.category_id, product.is_resellable) : product.price;
  const discountPercent = getDiscountPercent(product.category_id, product.is_resellable);
  const hasMemberDiscount = isEligible && memberPrice < product.price;

  return (
    <Link to={`/products/${product.slug}`} className="group block h-full">
      <div className="overflow-hidden h-full rounded-lg border border-border bg-card hover:border-primary/30 transition-colors duration-200">
        <div className="aspect-[4/3] relative overflow-hidden bg-muted">
          {product.images?.[0] ? (
            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <span className="text-muted-foreground text-sm">No image</span>
            </div>
          )}
        </div>
        {/* Store strip */}
        <div className="h-6 flex items-center gap-1 px-2 bg-muted/60">
          {product.stores?.logo_url && (
            <img src={product.stores.logo_url} alt="" className="h-3 w-3 rounded-sm object-cover flex-shrink-0" />
          )}
          <span className="text-[9px] text-muted-foreground font-medium truncate">{product.stores?.name}</span>
          {product.stores?.is_verified && <ShieldCheck className="h-2.5 w-2.5 text-blue-400 flex-shrink-0" />}
          {product.stores?.is_trusted && <Award className="h-2.5 w-2.5 text-amber-400 flex-shrink-0" />}
        </div>
        <div className="p-2.5">
          {product.categories?.name && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5">
              <Package className="h-2.5 w-2.5" />
              {product.categories.name}
            </span>
          )}
          <h3 className="text-xs sm:text-sm font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors mb-1">
            {product.name}
          </h3>
          <div className="flex items-center gap-1.5 flex-wrap">
            {hasMemberDiscount ? (
              <>
                <span className="text-xs sm:text-sm font-bold text-amber-500">{formatPrice(memberPrice)}</span>
                <span className="text-[10px] text-muted-foreground line-through">{formatPrice(product.price)}</span>
                <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[10px] font-bold">
                  <Crown className="h-2.5 w-2.5" />
                  {discountPercent}%
                </span>
              </>
            ) : (
              <span className="text-xs sm:text-sm font-bold text-foreground">{formatPrice(product.price)}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function PWARecentReleases() {
  const { data: products, isLoading } = useFeaturedProducts({
    limit: 11,
    maxPerStore: 3,
    queryKey: 'pwa-recent-featured',
  });

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent Releases</h3>
        </div>
        <div className="space-y-3">
          <Skeleton className="aspect-[16/9] rounded-lg" />
          <Skeleton className="aspect-[16/9] rounded-lg" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="aspect-[4/3] rounded-lg" />
            <Skeleton className="aspect-[4/3] rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!products?.length) return null;

  const spotlights = products.slice(0, 2);
  const gridProducts = products.slice(2, 11);

  return (
    <div>
      <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent Releases</h3>
        <Link to="/products" className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-0.5">
          View all <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="space-y-3">
        {/* Two spotlight cards side by side */}
        <div className="grid grid-cols-2 gap-3">
          {spotlights.map((product) => (
            <SpotlightCard key={product.id} product={product} />
          ))}
        </div>

        {/* 9 products in rows of 3 */}
        {gridProducts.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {gridProducts.map((product) => (
              <GridCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
