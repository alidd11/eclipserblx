import { Link } from 'react-router-dom';
import { ShoppingBag, Store, Download, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ActiveOffersCard } from '@/components/home/ActiveOffersCard';
import { PWAFeaturedStores } from '@/components/landing/PWAFeaturedStores';
import { PWARecentReleases } from '@/components/landing/PWARecentReleases';
import { HeroBanner } from './HeroBanner';
import { useTranslation } from 'react-i18next';
import { useFeaturedProducts, ScoredProduct } from '@/hooks/useFeaturedProducts';
import { useCurrency } from '@/hooks/useCurrency';
import { useSubscription } from '@/hooks/useSubscription';
import { ShieldCheck, Award, Crown, Tag } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function isNewProduct(createdAt: string) {
  const DAY_MS = 86400000;
  return Date.now() - new Date(createdAt).getTime() < 7 * DAY_MS;
}

function StoreBannerStrip({ product, textSize = 'text-[11px]' }: { product: ScoredProduct; textSize?: string }) {
  return (
    <div
      className="h-8 relative flex items-center gap-1.5 px-2 overflow-hidden"
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
        <span className={cn(textSize, "font-medium truncate", product.stores?.banner_url ? "text-white" : "text-foreground")}>{product.stores?.name}</span>
        {product.stores?.is_verified && <ShieldCheck className="h-3 w-3 text-blue-400 flex-shrink-0" />}
        {product.stores?.is_trusted && <Award className="h-3 w-3 text-amber-400 flex-shrink-0" />}
      </div>
    </div>
  );
}

function PWASpotlightCard({ product }: { product: ScoredProduct }) {
  const { formatPrice } = useCurrency();
  const { getMemberPrice, getDiscountPercent, isEligibleForDiscount } = useSubscription();

  const isEligible = isEligibleForDiscount(product.category_id, product.is_resellable, product.stores?.eclipse_plus_discount_enabled);
  const memberPrice = getMemberPrice(product.price, product.category_id, product.is_resellable);
  const discountPercent = getDiscountPercent(product.category_id, product.is_resellable);
  const hasMemberDiscount = isEligible && memberPrice < product.price;
  const isNew = isNewProduct(product.created_at);

  return (
    <Link
      to={`/products/${product.slug}`}
      className="block rounded-lg overflow-hidden border border-border bg-card hover:border-primary/30 transition-colors active:scale-[0.99]"
    >
      <div className="aspect-[16/9] relative overflow-hidden bg-muted">
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">No image</div>
        )}
        {/* Badges */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          {isNew && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-bold">
              <Sparkles className="h-2.5 w-2.5" />New
            </span>
          )}
          {product.is_featured && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/90 text-white text-[10px] font-bold">
              ★ Featured
            </span>
          )}
        </div>
      </div>
      <StoreBannerStrip product={product} />
      <div className="p-3">
        <div className="flex items-center justify-between mb-1">
          {product.categories?.name ? (
            <Link
              to={`/products?category=${product.categories.slug}`}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Tag className="h-2.5 w-2.5" />
              {product.categories.name}
            </Link>
          ) : <span />}
          {product.download_count > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Download className="h-2.5 w-2.5" />
              {product.download_count}
            </span>
          )}
        </div>
        <h4 className="font-medium text-base text-foreground line-clamp-1 mb-1">{product.name}</h4>
        <div className="flex items-center gap-1.5 flex-wrap">
          {hasMemberDiscount ? (
            <>
              <span className="text-amber-500 font-bold text-base">{formatPrice(memberPrice)}</span>
              <span className="text-xs text-muted-foreground line-through">{formatPrice(product.price)}</span>
              <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[9px] font-bold">
                <Crown className="h-2 w-2" />{discountPercent}%
              </span>
            </>
          ) : (
            <span className="text-foreground font-bold text-base">{formatPrice(product.price)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function PWAProductCard({ product }: { product: ScoredProduct }) {
  const { formatPrice } = useCurrency();
  const { getMemberPrice, getDiscountPercent, isEligibleForDiscount } = useSubscription();

  const isEligible = isEligibleForDiscount(product.category_id, product.is_resellable, product.stores?.eclipse_plus_discount_enabled);
  const memberPrice = getMemberPrice(product.price, product.category_id, product.is_resellable);
  const discountPercent = getDiscountPercent(product.category_id, product.is_resellable);
  const hasMemberDiscount = isEligible && memberPrice < product.price;
  const isNew = isNewProduct(product.created_at);

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
        {/* Badges */}
        <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
          {isNew && (
            <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-primary text-primary-foreground text-[9px] font-bold">
              <Sparkles className="h-2 w-2" />New
            </span>
          )}
        </div>
      </div>
      <StoreBannerStrip product={product} />
      <div className="p-3">
        <div className="flex items-center justify-between mb-1">
          {product.categories?.name ? (
            <Link
              to={`/products?category=${product.categories.slug}`}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Tag className="h-2.5 w-2.5" />
              {product.categories.name}
            </Link>
          ) : <span />}
          {product.download_count > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Download className="h-2.5 w-2.5" />
              {product.download_count}
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
    limit: 7,
    maxPerStore: 2,
    queryKey: 'pwa-featured-scored',
  });

  const spotlightProduct = featuredProducts?.[0];
  const gridProducts = featuredProducts?.slice(1);

  return (
    <div
      className="flex flex-col"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="relative overflow-hidden">
        <HeroBanner />

        <div className="relative z-10 flex flex-col items-center justify-center px-6 py-8">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-center leading-tight tracking-tight mb-3">
            {t('landing.pwaHeadline')}{' '}
            <span className="text-foreground">{t('landing.pwaHeadlineHighlight')}</span>
          </h1>

          <p className="text-muted-foreground text-center text-base max-w-md mb-6 leading-relaxed">
            {t('landing.pwaDescription')}
          </p>

          <div className="w-full max-w-sm space-y-3 mb-8">
            <Link to="/products" className="block">
              <Button size="lg" className="w-full h-14 text-lg font-semibold rounded-full">
                <ShoppingBag className="mr-2 h-5 w-5" />
                {t('landing.shop')}
              </Button>
            </Link>

            <Link to="/seller" className="block">
              <Button size="lg" variant="outline" className="w-full h-14 text-lg font-semibold rounded-full">
                <Store className="mr-2 h-5 w-5" />
                {t('landing.openAStore')}
              </Button>
            </Link>
          </div>

          <div className="w-full px-0 space-y-6 pb-6">
            <PWAFeaturedStores />

            {/* Recent Releases - 2 cards rotating every 3s */}
            <PWARecentReleases />

            <ActiveOffersCard />

            {/* Featured Products — spotlight + grid */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">{t('landing.featuredProducts')}</h3>
                <Link to="/products" className="text-xs text-primary hover:underline">
                  {t('landing.viewAll')} →
                </Link>
              </div>

              {productsLoading ? (
                <div className="space-y-3">
                  <div className="rounded-lg overflow-hidden border border-border bg-card">
                    <Skeleton className="aspect-[16/9]" />
                    <div className="p-3 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/3" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="rounded-lg overflow-hidden border border-border bg-card">
                        <Skeleton className="aspect-[4/3]" />
                        <div className="p-3 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-4 w-1/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : featuredProducts?.length ? (
                <div className="space-y-3">
                  {/* Spotlight: first product full-width */}
                  {spotlightProduct && (
                    <PWASpotlightCard product={spotlightProduct} />
                  )}
                  {/* Grid: remaining products */}
                  {gridProducts?.length ? (
                    <div className="grid grid-cols-2 gap-3">
                      {gridProducts.map((product) => (
                        <PWAProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}