import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, ShieldCheck, Award, Crown, Package } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';
import { useSubscription } from '@/hooks/useSubscription';

interface PopularProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[] | null;
  category_id: string | null;
  is_resellable: boolean;
  download_count: number;
  categories: { name: string } | null;
  stores: {
    name: string;
    logo_url: string | null;
    is_verified: boolean;
    is_trusted: boolean;
    eclipse_plus_discount_enabled: boolean;
  } | null;
}

function PopularProductCard({ product, rank }: { product: PopularProduct; rank: number }) {
  const { formatPrice } = useCurrency();
  const { getMemberPrice, getDiscountPercent, isEligibleForDiscount } = useSubscription();

  const isEligible = isEligibleForDiscount(product.category_id, product.is_resellable, product.stores?.eclipse_plus_discount_enabled);
  const memberPrice = getMemberPrice(product.price, product.category_id, product.is_resellable);
  const discountPercent = getDiscountPercent(product.category_id, product.is_resellable);
  const hasMemberDiscount = isEligible && memberPrice < product.price;

  return (
    <Link to={`/products/${product.slug}`} className="group block">
      <div className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors">
        {/* Rank badge */}
        <div className="flex-shrink-0 w-7 h-7 rounded-md bg-muted flex items-center justify-center">
          <span className="text-xs font-bold text-muted-foreground">#{rank}</span>
        </div>

        {/* Product image */}
        <div className="flex-shrink-0 w-16 h-12 rounded-md overflow-hidden bg-muted">
          {product.images?.[0] ? (
            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-4 w-4 text-muted-foreground/30" />
            </div>
          )}
        </div>

        {/* Product details */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
            {product.name}
          </h4>
          <div className="flex items-center gap-1.5 mt-0.5">
            {product.stores?.logo_url && (
              <img src={product.stores.logo_url} alt="" className="h-3 w-3 rounded-sm object-cover flex-shrink-0" />
            )}
            <span className="text-[10px] text-muted-foreground truncate">{product.stores?.name}</span>
            {product.stores?.is_verified && <ShieldCheck className="h-2.5 w-2.5 text-blue-400 flex-shrink-0" />}
            {product.stores?.is_trusted && <Award className="h-2.5 w-2.5 text-amber-400 flex-shrink-0" />}
          </div>
        </div>

        {/* Price */}
        <div className="flex-shrink-0 text-right">
          {hasMemberDiscount ? (
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-amber-500 block">{formatPrice(memberPrice)}</span>
              <span className="text-[10px] text-muted-foreground line-through block">{formatPrice(product.price)}</span>
            </div>
          ) : (
            <span className="text-xs font-bold text-foreground">{formatPrice(product.price)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function MostPopularSection() {
  const { data: products, isLoading } = useQuery({
    queryKey: ['most-popular-products'],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, slug, price, images, category_id, is_resellable, download_count,
          categories (name),
          stores!inner (name, logo_url, is_verified, is_trusted, is_active, is_testing, eclipse_plus_discount_enabled)
        `)
        .eq('is_active', true)
        .eq('stores.is_active', true)
        .eq('stores.is_testing', false)
        .or(`release_at.is.null,release_at.lte.${now}`)
        .order('download_count', { ascending: false })
        .limit(3);

      if (error) throw error;
      return (data as unknown as PopularProduct[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5" />
          Most Popular
        </h2>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[68px] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!products?.length) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <TrendingUp className="h-3.5 w-3.5" />
        Most Popular
      </h2>
      <div className="space-y-2">
        {products.map((product, i) => (
          <PopularProductCard key={product.id} product={product} rank={i + 1} />
        ))}
      </div>
    </div>
  );
}
