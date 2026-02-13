import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Award, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useFeaturedProducts, ScoredProduct } from '@/hooks/useFeaturedProducts';
import { useCurrency } from '@/hooks/useCurrency';
import { useSubscription } from '@/hooks/useSubscription';
import { useTranslation } from 'react-i18next';
import ukFlag from '@/assets/regions/uk-flag.jpg';
import usFlag from '@/assets/regions/us-flag.jpg';
import euFlag from '@/assets/regions/eu-flag.jpg';
import beFlag from '@/assets/regions/be-flag.png';

const getRegionFlag = (productName?: string): { src: string; name: string } | null => {
  const nameLower = productName?.toLowerCase() || '';
  if (nameLower.includes('ypres') || nameLower.includes('belgium')) return { src: beFlag, name: 'Belgium' };
  if (nameLower.includes('land rover') || nameLower.includes('landrover')) return { src: ukFlag, name: 'UK' };
  if (nameLower.startsWith('uk ') || nameLower.includes(' uk ')) return { src: ukFlag, name: 'UK' };
  if (nameLower.startsWith('us ') || nameLower.includes(' us ')) return { src: usFlag, name: 'US' };
  if (nameLower.startsWith('eu ') || nameLower.includes(' eu ')) return { src: euFlag, name: 'EU' };
  return null;
};

type FeaturedProduct = ScoredProduct;

const ProductCard = forwardRef<HTMLAnchorElement, { product: FeaturedProduct; featured?: boolean }>(
  function ProductCard({ product, featured = false }, ref) {
    const { formatPrice } = useCurrency();
    const { getMemberPrice, getDiscountPercent, isEligibleForDiscount } = useSubscription();
    const regionFlag = getRegionFlag(product.name);
    
    const isEligible = isEligibleForDiscount(product.category_id, product.is_resellable, product.stores?.eclipse_plus_discount_enabled);
    const memberPrice = getMemberPrice(product.price, product.category_id, product.is_resellable);
    const discountPercent = getDiscountPercent(product.category_id, product.is_resellable);
    const hasMemberDiscount = isEligible && memberPrice < product.price;
    
    return (
      <Link ref={ref} to={`/products/${product.slug}`} className="group block h-full">
        <div className="overflow-hidden h-full rounded-lg border border-border bg-card hover:border-primary/30 transition-colors duration-200">
          {/* Image */}
          <div className={`relative overflow-hidden bg-muted ${featured ? 'aspect-[16/10]' : 'aspect-[4/3]'}`}>
            {product.images?.[0] ? (
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <span className="text-muted-foreground text-sm">No image</span>
              </div>
            )}
            
            {/* Store overlay */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2.5">
              <div className="flex items-center gap-1.5">
                {product.stores?.logo_url ? (
                  <img 
                    src={product.stores.logo_url} 
                    alt={product.stores.name}
                    className="h-5 w-5 rounded object-contain bg-white/10"
                  />
                ) : null}
                <span className="text-white text-xs font-medium truncate">
                  {product.stores?.name}
                </span>
                {product.stores?.is_verified && (
                  <ShieldCheck className="h-3 w-3 text-blue-400 flex-shrink-0" />
                )}
                {product.stores?.is_trusted && (
                  <Award className="h-3 w-3 text-amber-400 flex-shrink-0" />
                )}
              </div>
            </div>
          </div>

          <div className="p-3 relative overflow-hidden">
            {regionFlag && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <img src={regionFlag.src} alt="" className="absolute inset-0 w-full h-full opacity-[0.06] object-cover" />
              </div>
            )}
            
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
      <div className="px-4 sm:px-6 lg:px-8">
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductSkeleton key={i} featured={i < 2} />
            ))}
          </div>
        ) : products?.length ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
