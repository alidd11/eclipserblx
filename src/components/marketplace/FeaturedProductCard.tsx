import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, Award, Crown, Package, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';
import { useSubscription } from '@/hooks/useSubscription';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Featured Product</h2>
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
    <div className="space-y-3">
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Featured Product</h2>
      <Link to={`/products/${product.slug}`} className="group block">
        <div className="relative rounded-lg overflow-hidden border border-border bg-card hover:border-primary/30 transition-colors">
          <div className="aspect-[2.5/1] sm:aspect-[3/1] relative overflow-hidden bg-muted">
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

            {/* Content overlay */}
            <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-6">
              {/* Featured badge */}
              <Badge className="w-fit mb-2 text-[10px] px-1.5 py-0.5 gap-1 bg-primary/90 text-primary-foreground border-0">
                <Star className="h-2.5 w-2.5 fill-current" />
                Featured
              </Badge>

              {/* Product name */}
              <h3 className="text-white font-bold text-base sm:text-xl line-clamp-1 group-hover:text-primary transition-colors">
                {product.name}
              </h3>

              {/* Description */}
              {product.description && (
                <p className="text-white/60 text-xs sm:text-sm line-clamp-1 mt-0.5 hidden sm:block">
                  {product.description}
                </p>
              )}

              {/* Price */}
              <div className="flex items-center gap-2 mt-1.5">
                {hasMemberDiscount ? (
                  <>
                    <span className="text-amber-500 font-bold text-sm sm:text-base">{formatPrice(memberPrice)}</span>
                    <span className="text-white/50 text-xs line-through">{formatPrice(product.price)}</span>
                    <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                      <Crown className="h-2.5 w-2.5" />
                      {discountPercent}%
                    </span>
                  </>
                ) : (
                  <span className="text-white font-bold text-sm sm:text-base">{formatPrice(product.price)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Store banner strip */}
          <div
            className="h-10 relative flex items-center gap-2 px-3 overflow-hidden"
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
            <div className="relative z-10 flex items-center gap-2 min-w-0">
              {product.stores?.logo_url && (
                <img src={product.stores.logo_url} alt="" className="h-5 w-5 rounded object-contain bg-white/10 flex-shrink-0" />
              )}
              <span className={cn("text-xs font-medium truncate", product.stores?.banner_url ? "text-white" : "text-foreground")}>
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
