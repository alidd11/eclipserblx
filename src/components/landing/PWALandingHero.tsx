import { Link } from 'react-router-dom';
import { ShoppingBag, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ActiveOffersCard } from '@/components/home/ActiveOffersCard';
import { ReviewsShowcase } from '@/components/home/ReviewsShowcase';
import { PWAFeaturedStores } from '@/components/landing/PWAFeaturedStores';
import { RecentReleasesCarousel } from '@/components/marketplace/RecentReleasesCarousel';
import { HeroBanner } from './HeroBanner';
import { useTranslation } from 'react-i18next';
import { useFeaturedProducts } from '@/hooks/useFeaturedProducts';
import { useCurrency } from '@/hooks/useCurrency';
import { useSubscription } from '@/hooks/useSubscription';
import { ShieldCheck, Award, Crown, Tag, Star } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

function PWAProductCard({ product }: { product: any }) {
  const { formatPrice } = useCurrency();
  const { getMemberPrice, getDiscountPercent, isEligibleForDiscount } = useSubscription();
  
  const isEligible = isEligibleForDiscount(product.category_id, product.is_resellable, product.stores?.eclipse_plus_discount_enabled);
  const memberPrice = getMemberPrice(product.price, product.category_id, product.is_resellable);
  const discountPercent = getDiscountPercent(product.category_id, product.is_resellable);
  const hasMemberDiscount = isEligible && memberPrice < product.price;
  
  return (
    <Link 
      to={`/products/${product.slug}`}
      className="block rounded-lg overflow-hidden border border-border bg-card hover:border-primary/30 transition-colors active:scale-[0.98]"
    >
      <div className="aspect-[4/3] relative overflow-hidden bg-muted">
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">No image</div>
        )}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 pt-6">
          <div className="flex items-center gap-1.5">
            {product.stores?.logo_url && (
              <img src={product.stores.logo_url} alt="" className="h-5 w-5 rounded object-cover bg-white/10" />
            )}
            <span className="text-white text-xs truncate">{product.stores?.name}</span>
            {product.stores?.is_verified && <ShieldCheck className="h-3 w-3 text-blue-400 flex-shrink-0" />}
            {product.stores?.is_trusted && <Award className="h-3 w-3 text-amber-400 flex-shrink-0" />}
          </div>
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between mb-1">
          {product.categories?.name ? (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Tag className="h-2.5 w-2.5" />
              {product.categories.name}
            </span>
          ) : <span />}
          {typeof product.average_rating === 'number' && product.average_rating > 0 && (
            <span className="flex items-center gap-0.5 text-muted-foreground">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="text-[10px] font-medium">{product.average_rating.toFixed(1)}</span>
            </span>
          )}
        </div>
        <h4 className="font-medium text-sm text-foreground line-clamp-1 mb-1">{product.name}</h4>
        <div className="flex items-center gap-1.5 flex-wrap">
          {hasMemberDiscount ? (
            <>
              <span className="text-amber-500 font-bold text-sm">{formatPrice(memberPrice)}</span>
              <span className="text-[10px] text-muted-foreground line-through">{formatPrice(product.price)}</span>
              <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[9px] font-bold">
                <Crown className="h-2 w-2" />{discountPercent}%
              </span>
            </>
          ) : (
            <span className="text-foreground font-bold text-sm">{formatPrice(product.price)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function PWALandingHero() {
  const { t } = useTranslation();
  const { data: featuredProducts, isLoading: productsLoading } = useFeaturedProducts({
    limit: 6,
    maxPerStore: 2,
    queryKey: 'pwa-featured-scored',
  });

  return (
    <div 
      className="flex flex-col"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="relative overflow-hidden">
        <HeroBanner />
        
        <div className="relative z-10 flex flex-col px-4 py-6">
          {/* Quick action buttons */}
          <div className="flex gap-3 mb-6">
            <Link to="/products" className="flex-1">
              <Button size="lg" className="w-full h-12 text-base font-semibold">
                <ShoppingBag className="mr-2 h-5 w-5" />
                {t('landing.shop')}
              </Button>
            </Link>
            <Link to="/seller" className="flex-1">
              <Button size="lg" variant="outline" className="w-full h-12 text-base font-semibold">
                <Store className="mr-2 h-5 w-5" />
                {t('landing.openAStore')}
              </Button>
            </Link>
          </div>

          <div className="space-y-6 pb-6">
            {/* Recent Releases - horizontal carousel like ClearlyDev */}
            <RecentReleasesCarousel />
            
            <PWAFeaturedStores />
            <ActiveOffersCard />
            
            {/* Featured Products grid */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">{t('landing.featuredProducts')}</h3>
                <Link to="/products" className="text-xs text-primary hover:underline">
                  {t('landing.viewAll')} →
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {productsLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-lg overflow-hidden border border-border bg-card">
                      <Skeleton className="aspect-[4/3]" />
                      <div className="p-3 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/3" />
                      </div>
                    </div>
                  ))
                ) : featuredProducts?.length ? (
                  featuredProducts.map((product) => (
                    <PWAProductCard key={product.id} product={product} />
                  ))
                ) : null}
              </div>
            </div>
            
            <ReviewsShowcase />
          </div>
        </div>
      </div>
    </div>
  );
}
