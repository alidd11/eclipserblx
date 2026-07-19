import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Award, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useFeaturedProducts, ScoredProduct } from '@/hooks/useFeaturedProducts';
import { useCurrency } from '@/hooks/useCurrency';
import { useSubscription } from '@/hooks/useSubscription';
import { useTranslation } from 'react-i18next';
import { getFirstImageUrl } from '@/lib/mediaUtils';

type FeaturedProduct = ScoredProduct;

const ProductCard = forwardRef<HTMLAnchorElement, { product: FeaturedProduct; featured?: boolean }>(
  function ProductCard({ product, featured = false }, ref) {
    const { formatPrice } = useCurrency();
    const { getMemberPrice, getDiscountPercent, isEligibleForDiscount } = useSubscription();
    
    const isEligible = isEligibleForDiscount(product.category_id, product.is_resellable, undefined);
    const memberPrice = getMemberPrice(product.price, product.category_id, product.is_resellable);
    const discountPercent = getDiscountPercent(product.category_id, product.is_resellable);
    const hasMemberDiscount = isEligible && memberPrice < product.price;
    
    return (
      <Link ref={ref} to={`/products/${(product as any).product_number}`} className="group block h-full">
        <div className="overflow-hidden h-full rounded-lg border border-border bg-card hover:border-primary/30 transition-colors duration-200">
          {/* Image */}
          <div className={`relative overflow-hidden bg-muted ${featured ? 'aspect-[16/10]' : 'aspect-[4/3]'}`}>
            {(() => {
              const imgUrl = getFirstImageUrl(product.images, 400, 300, 'contain');
              return imgUrl ? (
                <img
                  src={imgUrl}
                  alt={product.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-contain object-center"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <span className="text-muted-foreground text-sm">No image</span>
                </div>
              );
            })()}
            
            {/* Store overlay */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2.5">
              <div className="flex items-center gap-1.5">
                {product.stores?.logo_url ? (
                  <img 
                    src={product.stores.logo_url} 
                    alt={product.stores.name}
                    className="h-5 w-5 rounded object-contain bg-background/10"
                  />
                ) : null}
                <span className="text-foreground text-xs font-medium truncate">
                  {product.stores?.name}
                </span>
                {product.stores?.is_verified && (
                  <ShieldCheck className="h-3 w-3 text-blue-400 flex-shrink-0" />
                )}
              </div>
            </div>
          </div>

          <div className="p-3 relative overflow-hidden">
            <h3 className={`font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors mb-1.5 relative z-10 ${featured ? 'text-base' : 'text-sm'}`}>
              {product.name}
            </h3>
            
            <div className="flex items-center gap-2 flex-wrap relative z-10">
              {hasMemberDiscount ? (
                <>
                  <span className={`font-bold text-amber-500 ${featured ? 'text-base' : 'text-sm'}`}>
                    {formatPrice(memberPrice)}
                  </span>
                  <span className="text-xs text-muted-foreground line-through">
                    {formatPrice(product.price)}
                  </span>
                  <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[10px] font-bold">
                    <Crown className="h-2.5 w-2.5" />
                    {discountPercent}%
                  </span>
                </>
              ) : (
                <span className={`font-bold text-foreground ${featured ? 'text-base' : 'text-sm'}`}>
                  {formatPrice(product.price)}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  }
);

function ProductSkeleton({ featured = false }: { featured?: boolean }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Skeleton className={featured ? 'aspect-[16/10]' : 'aspect-[4/3]'} />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  );
}

export function LandingFeaturedProducts() {
  const { t } = useTranslation();
  const { data: products, isLoading } = useFeaturedProducts({
    limit: 8,
    maxPerStore: 2,
    queryKey: 'landing-featured-scored',
  });

  return (
    <section className="py-10 sm:py-14">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold mb-1">
              {t('landing.featuredProducts')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('landing.featuredProductsDesc')}
            </p>
          </div>
          <Link to="/products">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
              {t('landing.viewAllProducts')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {/* Asymmetric grid: 2 large + 6 smaller */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductSkeleton key={i} featured={i < 2} />
            ))}
          </div>
        ) : products?.length ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {/* First 2 products span 2 cols on large screens */}
            {products.slice(0, 2).map((product) => (
              <div key={product.id} className="col-span-1 lg:col-span-2">
                <ProductCard product={product} featured />
              </div>
            ))}
            {/* Remaining products in regular grid */}
            {products.slice(2).map((product) => (
              <div key={product.id} className="col-span-1">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            {t('landing.noFeaturedProducts')}
          </div>
        )}
      </div>
    </section>
  );
}
