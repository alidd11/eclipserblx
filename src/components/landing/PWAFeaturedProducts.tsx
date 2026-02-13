import { Link } from 'react-router-dom';
import { ChevronRight, ShieldCheck, Award, Crown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useFeaturedProducts, ScoredProduct } from '@/hooks/useFeaturedProducts';
import { useCurrency } from '@/hooks/useCurrency';
import { useSubscription } from '@/hooks/useSubscription';
import { useTranslation } from 'react-i18next';

type FeaturedProduct = ScoredProduct;

function ProductCard({ product }: { product: FeaturedProduct }) {
  const { formatPrice } = useCurrency();
  const { getMemberPrice, getDiscountPercent, isEligibleForDiscount } = useSubscription();
  
  const isEligible = isEligibleForDiscount(product.category_id, product.is_resellable, product.stores?.eclipse_plus_discount_enabled);
  const memberPrice = getMemberPrice(product.price, product.category_id, product.is_resellable);
  const discountPercent = getDiscountPercent(product.category_id, product.is_resellable);
  const hasMemberDiscount = isEligible && memberPrice < product.price;
  
  return (
    <Link 
      to={`/products/${product.slug}`}
      className="block rounded-xl overflow-hidden border border-primary/10 bg-gradient-to-br from-card via-card to-primary/5 hover:border-primary/30 transition-all active:scale-[0.98]"
    >
      {/* Image */}
      <div className="aspect-[4/3] relative overflow-hidden bg-muted">
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
            No image
          </div>
        )}
        
        {/* Store badge overlay */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2">
          <div className="flex items-center gap-1.5">
            {product.stores?.logo_url && (
              <img 
                src={product.stores.logo_url} 
                alt=""
                className="h-5 w-5 rounded object-cover bg-white/10"
              />
            )}
            <span className="text-white text-xs truncate">{product.stores?.name}</span>
            {product.stores?.is_verified && (
              <ShieldCheck className="h-3 w-3 text-blue-400 flex-shrink-0" />
            )}
            {product.stores?.is_trusted && (
              <Award className="h-3 w-3 text-amber-400 flex-shrink-0" />
            )}
          </div>
        </div>
      </div>
      
      {/* Info */}
      <div className="p-3">
        <h4 className="font-medium text-sm text-foreground line-clamp-1 mb-1">
          {product.name}
        </h4>
        <div className="flex items-center gap-1.5 flex-wrap">
          {hasMemberDiscount ? (
            <>
              <span className="text-amber-500 font-bold text-sm">
                {formatPrice(memberPrice)}
              </span>
              <span className="text-[10px] text-muted-foreground line-through">
                {formatPrice(product.price)}
              </span>
              <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[9px] font-bold">
                <Crown className="h-2 w-2" />
                {discountPercent}%
              </span>
            </>
          ) : (
            <span className="text-primary font-bold text-sm">
              {formatPrice(product.price)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function ProductSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden border border-primary/10 bg-gradient-to-br from-card via-card to-primary/5">
      <Skeleton className="aspect-[4/3]" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  );
}

export function PWAFeaturedProducts() {
  const { t } = useTranslation();
  const { data: products, isLoading } = useFeaturedProducts({
    limit: 6,
    maxPerStore: 2,
    queryKey: 'pwa-featured-scored',
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{t('landing.featuredProducts')}</h3>
        <Link 
          to="/products" 
          className="text-xs text-primary hover:underline flex items-center gap-0.5"
        >
          {t('landing.viewAll')}
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <ProductSkeleton key={i} />
          ))
        ) : products?.length ? (
          products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))
        ) : (
          <p className="col-span-2 text-sm text-muted-foreground text-center py-4">
            {t('landing.noProductsAvailable')}
          </p>
        )}
      </div>
    </div>
  );
}
