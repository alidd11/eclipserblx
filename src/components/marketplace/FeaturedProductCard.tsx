import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, Award, Crown, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';
import { useSubscription } from '@/hooks/useSubscription';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface FeaturedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[] | null;
  description: string | null;
  category_id: string | null;
  is_resellable: boolean;
  download_count: number;
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

export function FeaturedProductCard() {
  const { formatPrice } = useCurrency();
  const { getMemberPrice, getDiscountPercent, isEligibleForDiscount } = useSubscription();

  const { data: product, isLoading } = useQuery({
    queryKey: ['featured-product-standalone'],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, slug, price, images, description, category_id, is_resellable, download_count,
          categories (name, slug),
          stores!inner (name, slug, logo_url, banner_url, is_verified, is_trusted, is_active, is_testing, eclipse_plus_discount_enabled)
        `)
        .eq('is_active', true)
        .eq('is_featured', true)
        .eq('stores.is_active', true)
        .eq('stores.is_testing', false)
        .or(`release_at.is.null,release_at.lte.${now}`)
        .order('download_count', { ascending: false })
        .limit(1);

      if (error) throw error;
      return (data?.[0] as unknown as FeaturedProduct) ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Featured</span>
        <Skeleton className="w-full aspect-[2.5/1] rounded-lg" />
      </div>
    );
  }

  if (!product) return null;

  const isEligible = isEligibleForDiscount(product.category_id, product.is_resellable, product.stores?.eclipse_plus_discount_enabled);
  const memberPrice = isEligible ? getMemberPrice(product.price, product.category_id, product.is_resellable) : product.price;
  const discountPercent = getDiscountPercent(product.category_id, product.is_resellable);
  const hasMemberDiscount = isEligible && memberPrice < product.price;

  return (
    <div className="space-y-2">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Featured</span>
      <Link to={`/products/${product.slug}`} className="group block">
        <div className="relative rounded-lg overflow-hidden border border-border bg-card hover:border-primary/30 transition-colors">
          {/* Product image */}
          <div className="aspect-[2.5/1] sm:aspect-[3/1] relative overflow-hidden bg-black/20">
            {product.images?.[0] ? (
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <Package className="h-10 w-10 text-muted-foreground/30" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Content overlay */}
            <div className="absolute inset-0 flex flex-col justify-end p-3 sm:p-5">
              {/* Category */}
              {product.categories?.name && (
                <span className="text-[10px] font-medium uppercase tracking-wider text-white/50 mb-0.5">
                  {product.categories.name}
                </span>
              )}

              {/* Product name */}
              <h3 className="text-white font-display font-bold text-sm sm:text-lg line-clamp-1 leading-tight">
                {product.name}
              </h3>

              {/* Price row */}
              <div className="flex items-center gap-2 mt-1">
                {hasMemberDiscount ? (
                  <>
                    <span className="text-amber-400 font-bold text-xs sm:text-sm">{formatPrice(memberPrice)}</span>
                    <span className="text-white/40 text-[10px] sm:text-xs line-through">{formatPrice(product.price)}</span>
                    <span className="inline-flex items-center gap-0.5 px-1 py-px rounded bg-amber-500/15 text-amber-400 text-[9px] sm:text-[10px] font-semibold">
                      <Crown className="h-2.5 w-2.5" />
                      -{discountPercent}%
                    </span>
                  </>
                ) : (
                  <span className="text-white font-bold text-xs sm:text-sm">{formatPrice(product.price)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Store strip */}
          <div className="h-8 relative flex items-center gap-1.5 px-3 overflow-hidden bg-muted/60">
            <div className="flex items-center gap-1.5 min-w-0">
              {product.stores?.logo_url ? (
                <img src={product.stores.logo_url} alt="" className="h-4 w-4 rounded-sm object-cover flex-shrink-0" />
              ) : (
                <div className="h-4 w-4 rounded-sm bg-muted flex-shrink-0" />
              )}
              <span className="text-[11px] font-medium truncate text-muted-foreground">
                {product.stores?.name}
              </span>
              {product.stores?.is_verified && <ShieldCheck className="h-3 w-3 text-blue-400 flex-shrink-0" />}
              {product.stores?.is_trusted && <Award className="h-3 w-3 text-amber-400 flex-shrink-0" />}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}