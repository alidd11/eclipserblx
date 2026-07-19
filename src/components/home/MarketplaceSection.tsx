import { useEffect, useState, useMemo, memo, forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Store, ChevronRight, ShieldCheck, Award, Users, Search, Package, FlaskConical, Crown, Car, Code, Bot, Layout, Box, Palette, Wrench, Gamepad2, Map, Shirt, Plane, ArrowRight } from 'lucide-react';
import { usePrefetchProduct } from '@/hooks/usePrefetchProduct';
import { useTranslation } from 'react-i18next';
import { optimizeImageUrl } from '@/utils/optimizeImageUrl';
import { getFirstImageUrl } from '@/lib/mediaUtils';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useMarketplaceAccess } from '@/hooks/useFeatureFlag';
import { useCurrency } from '@/hooks/useCurrency';
import { BecomeSellerCard } from '@/components/marketplace/BecomeSellerCard';
import { TopStoresSection } from '@/components/marketplace/TopStoresSection';
import { MarketplaceBrowseToggle } from '@/components/marketplace/MarketplaceBrowseToggle';
import { RecentReleasesCarousel } from '@/components/marketplace/RecentReleasesCarousel';
import { FeaturedProductCard } from '@/components/marketplace/FeaturedProductCard';
import { MostPopularSection } from '@/components/marketplace/MostPopularSection';
import { useFeaturedProducts } from '@/hooks/useFeaturedProducts';
import { useSubscription } from '@/hooks/useSubscription';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { CategoriesGrid } from '@/components/marketplace/CategoriesGrid';

interface StoreData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  accent_color: string | null;
  is_verified: boolean;
  is_trusted: boolean;
  follower_count: number;
  is_testing?: boolean;
}

const StoreCard = memo(forwardRef<HTMLAnchorElement, { store: StoreData; showTestingBadge?: boolean }>(function StoreCard({ store, showTestingBadge }, ref) {
  const accentColor = store.accent_color || '#8B5CF6';
  
  return (
    <Link to={`/store/${store.slug}`} ref={ref}>
      <div className="group overflow-hidden h-full border border-border hover:border-primary/40 transition-colors duration-200 rounded-md bg-card">
        <div 
          className="h-20 relative overflow-hidden"
          style={{ 
            background: store.banner_url 
              ? `url(${optimizeImageUrl(store.banner_url, 540, 80)}) center/cover` 
              : `linear-gradient(135deg, ${accentColor}40, ${accentColor}20)`
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          {showTestingBadge && store.is_testing && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-orange-500/90 text-foreground border-0 text-[10px] gap-1">
                <FlaskConical className="h-2.5 w-2.5" />
                Testing
              </Badge>
            </div>
          )}
        </div>
        
        <div className="pt-0 -mt-8 relative px-3 pb-3">
          <div className="flex items-start gap-3 mb-1">
            {store.logo_url ? (
              <img 
                src={optimizeImageUrl(store.logo_url, 56, 56, 'contain')} 
                alt={`${store.name} logo`}
                width={56}
                height={56}
                loading="lazy"
                className="h-14 w-14 rounded-lg object-contain bg-card border border-border shadow-md flex-shrink-0 p-1"
              />
            ) : (
              <div 
                className="h-14 w-14 rounded-lg flex items-center justify-center shadow-md flex-shrink-0"
                style={{ backgroundColor: `${accentColor}20` }}
              >
                <Store className="h-6 w-6" style={{ color: accentColor }} />
              </div>
            )}
            
            <div className="flex-1 min-w-0 pt-4">
              <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {store.name}
              </h3>
            </div>
          </div>

          {(store.is_verified || store.is_trusted) && (
            <div className="flex items-center gap-1.5 mb-2">
              {store.is_verified && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary border border-primary/30 px-1.5 py-0.5">
                  <ShieldCheck className="h-2.5 w-2.5" />
                  Verified
                </span>
              )}
              {store.is_trusted && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-foreground border border-border bg-muted/60 px-1.5 py-0.5">
                  <Award className="h-2.5 w-2.5" />
                  Trusted
                </span>
              )}
            </div>
          )}
          
          {store.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
              {store.description}
            </p>
          )}
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {store.follower_count.toLocaleString()} followers
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </div>
    </Link>
  );
}));

const StoreCardSkeleton = forwardRef<HTMLDivElement>(function StoreCardSkeleton(_props, ref) {
  return (
    <div ref={ref} className="overflow-hidden h-full border border-border rounded-md bg-card">
      <Skeleton className="h-20 rounded-none" />
      <div className="pt-0 -mt-8 relative px-3 pb-3">
        <div className="flex items-start gap-3 mb-3">
          <Skeleton className="h-14 w-14 rounded-lg flex-shrink-0" />
          <div className="flex-1 pt-4 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-8 w-full mb-3" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
});

const MarketplaceProductCard = memo(function MarketplaceProductCard({ product }: { product: { id: string; name: string; slug: string; product_number?: number; price: number; images: string[] | null; category_id: string | null; is_resellable: boolean; categories?: { name: string } | null; stores: { name: string; logo_url: string | null; is_verified: boolean; is_trusted: boolean; } | null } }) {
  const { formatPrice } = useCurrency();
  const { getMemberPrice, getDiscountPercent, isEligibleForDiscount } = useSubscription();
  const prefetch = usePrefetchProduct();

  const isEligible = isEligibleForDiscount(product.category_id, product.is_resellable, product.stores?.undefined_removed);
  const memberPrice = getMemberPrice(product.price, product.category_id, product.is_resellable);
  const discountPercent = getDiscountPercent(product.category_id, product.is_resellable);
  const hasMemberDiscount = isEligible && memberPrice < product.price;

  return (
    <Link to={`/products/${(product as any).product_number}`} className="group block h-full" onMouseEnter={() => prefetch(String((product as any).product_number))}>
      <div className="overflow-hidden h-full rounded-lg border border-border bg-card hover:border-primary/30 transition-colors duration-200">
        <div className="aspect-[4/3] relative overflow-hidden bg-muted">
          {(() => {
            const imgUrl = getFirstImageUrl(product.images, 400, 300, 'contain');
            return imgUrl ? (
              <img src={imgUrl} alt={product.name} width={400} height={300} loading="lazy" decoding="async" {...({ fetchpriority: 'low' } as Record<string, string>)} className="w-full h-full object-contain object-center" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <span className="text-muted-foreground text-sm">No image</span>
              </div>
            );
          })()}
        </div>
        {/* Store strip */}
        <div className="h-7 flex items-center gap-1.5 px-2.5 bg-muted/60">
          {product.stores?.logo_url && (
            <img src={optimizeImageUrl(product.stores.logo_url, 14)} alt="" width={14} height={14} loading="lazy" decoding="async" className="h-3.5 w-3.5 rounded-sm object-cover flex-shrink-0" />
          )}
          <span className="text-[10px] text-muted-foreground font-medium truncate">{product.stores?.name}</span>
          {product.stores?.is_verified && <ShieldCheck className="h-3 w-3 text-blue-400 flex-shrink-0" />}
          {product.stores?.is_trusted && <Award className="h-3 w-3 text-amber-400 flex-shrink-0" />}
        </div>
        <div className="p-3">
          <div className="flex items-center justify-between mb-1.5">
            {product.categories?.name ? (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Package className="h-2.5 w-2.5" />
                {product.categories.name}
              </span>
            ) : <span />}
          </div>

          <h3 className="text-sm font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors mb-1">
            {product.name}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            {hasMemberDiscount ? (
              <>
                <span className="text-sm font-bold text-amber-500">{formatPrice(memberPrice)}</span>
                <span className="text-xs text-muted-foreground line-through">{formatPrice(product.price)}</span>
                <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[10px] font-bold">
                  <Crown className="h-2.5 w-2.5" />
                  {discountPercent}%
                </span>
              </>
            ) : (
              <span className="text-sm font-bold text-foreground">{formatPrice(product.price)}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
});

function SpotlightPrice({ product }: { product: { price: number; category_id: string | null; is_resellable: boolean; stores: { } | null } }) {
  const { formatPrice } = useCurrency();
  const { getMemberPrice, getDiscountPercent, isEligibleForDiscount } = useSubscription();
  const isEligible = isEligibleForDiscount(product.category_id, product.is_resellable, product.stores?.undefined_removed);
  const memberPrice = getMemberPrice(product.price, product.category_id, product.is_resellable);
  const discountPercent = getDiscountPercent(product.category_id, product.is_resellable);
  const hasMemberDiscount = isEligible && memberPrice < product.price;

  return (
    <div className="flex items-center gap-2 mt-1">
      {hasMemberDiscount ? (
        <>
          <span className="text-amber-500 font-bold text-sm">{formatPrice(memberPrice)}</span>
          <span className="text-foreground/50 text-xs line-through">{formatPrice(product.price)}</span>
          <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold">
            <Crown className="h-2.5 w-2.5" />
            {discountPercent}%
          </span>
        </>
      ) : (
        <span className="text-foreground font-bold text-sm">{formatPrice(product.price)}</span>
      )}
    </div>
  );
}

export const MarketplaceSection = forwardRef<HTMLElement>(function MarketplaceSection(_props, ref) {
  const { hasAccess, isAdmin, isMarketplacePublic, loading: accessLoading } = useMarketplaceAccess();
  const { isSeller } = useSellerStatus();
  const [browseMode, setBrowseMode] = useState<'stores' | 'products' | 'categories'>('stores');
  const [storePage, setStorePage] = useState(0);
  const STORES_PER_PAGE = 9;
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Fetch all approved stores
  const { data: stores, isLoading: storesLoading } = useQuery({
    queryKey: ['marketplace-stores', isAdmin],
    queryFn: async () => {
      let query = supabase
        .from('stores')
        .select('id, name, slug, description, logo_url, banner_url, accent_color, is_verified, is_trusted, follower_count, is_testing, product_count')
        .eq('status', 'approved')
        .eq('is_active', true)
        .order('is_trusted', { ascending: false })
        .order('is_verified', { ascending: false })
        .order('follower_count', { ascending: false });
      
      if (!isAdmin) {
        query = query.eq('is_testing', false);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as (StoreData & { is_testing?: boolean; product_count?: number })[];
    },
    enabled: hasAccess,
  });

  // Featured products for products mode
  const { data: featuredProducts, isLoading: productsLoading } = useFeaturedProducts({
    limit: 11,
    maxPerStore: 3,
    queryKey: 'marketplace-products',
  });

  if (accessLoading) {
    // Return a placeholder with min-height to prevent CLS (footer shifting)
    return <section className="min-h-[600px]" aria-hidden="true" />;
  }

  // Coming soon for non-admin non-public
  if (!isMarketplacePublic && !isAdmin) {
    return (
      <section className="container mx-auto px-4 py-6 sm:py-8 space-y-8">
        <div className="border-t border-border pt-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Eclipse Marketplace</p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">Coming Soon</h2>
          <p className="text-muted-foreground max-w-xl text-sm leading-relaxed">
            The Eclipse Marketplace is preparing for launch. Want to be one of our first sellers?
            Apply now and be ready when we go live.
          </p>
        </div>
        {!isSeller && (
          <div className="max-w-2xl">
            <BecomeSellerCard />
          </div>
        )}
      </section>
    );
  }

  if (!hasAccess && isMarketplacePublic) {
    return <section className="min-h-[600px]" aria-hidden="true" />;
  }

  const storesList = stores || [];
  // Get the spotlight store ID from TopStoresSection's query cache to avoid duplication
  const topStoresData = queryClient.getQueryData<{ id: string }[]>(['top-stores-featured']);
  const spotlightStoreId = topStoresData?.[0]?.id;
  const allStores = spotlightStoreId ? storesList.filter(s => s.id !== spotlightStoreId) : storesList;
  const totalStorePages = Math.ceil(allStores.length / STORES_PER_PAGE);
  const pagedStores = allStores.slice(storePage * STORES_PER_PAGE, (storePage + 1) * STORES_PER_PAGE);

  return (
    <section ref={ref} className="container mx-auto px-4 py-6 sm:py-8 space-y-8" style={{ contentVisibility: 'auto', containIntrinsicSize: '0 600px' }}>
      {/* Browse Mode Toggle */}
      <MarketplaceBrowseToggle mode={browseMode} onChange={setBrowseMode} />

      {/* === STORES MODE === */}
      {browseMode === 'stores' && (
        <>
          <TopStoresSection />
          <FeaturedProductCard />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {storesLoading ? (
              Array.from({ length: 9 }).map((_, i) => (
                <StoreCardSkeleton key={i} />
              ))
            ) : pagedStores.length > 0 ? (
              pagedStores.map((store) => (
                <StoreCard key={store.id} store={store} showTestingBadge={isAdmin} />
              ))
            ) : (
              <div className="col-span-full py-12 border-t border-b border-border">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">{t('marketplace.marketplace')}</p>
                <p className="text-lg font-bold text-foreground">{t('marketplace.noStoresYet')}</p>
                <p className="text-sm text-muted-foreground mt-1">{t('marketplace.checkBackSoon')}</p>
              </div>
            )}
          </div>
          {/* Pagination */}
          {totalStorePages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={storePage === 0}
                onClick={() => setStorePage(p => p - 1)}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                {storePage + 1} / {totalStorePages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={storePage >= totalStorePages - 1}
                onClick={() => setStorePage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* === PRODUCTS MODE === */}
      {browseMode === 'products' && (
        <>
          <FeaturedProductCard />
          <MostPopularSection />
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('marketplace.recentlyReleased')}</h2>
            <Link to="/products" className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-0.5">
              {t('marketplace.viewAll')} <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {productsLoading ? (
            <div className="space-y-4">
              <Skeleton className="aspect-[16/9] rounded-lg" />
              <div className="grid grid-cols-2 gap-3 sm:gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[4/3] rounded-lg" />
                ))}
              </div>
            </div>
          ) : featuredProducts?.length ? (
            <div className="space-y-4">
              {/* Spotlight product */}
              {(() => {
                const spotlights = featuredProducts.slice(0, 2);
                const gridProducts = featuredProducts.slice(2, 8);
                return (
                  <>
                    {/* Two spotlight products side by side */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-6">
                      {spotlights.map((spotlight) => (
                        <Link key={spotlight.id} to={`/products/${(spotlight as any).product_number}`} className="group block">
                          <div className="relative rounded-lg overflow-hidden border border-border bg-card hover:border-primary/30 transition-colors">
                            <div className="aspect-[16/9] relative overflow-hidden bg-muted">
                              {(() => {
                                const imgUrl = getFirstImageUrl(spotlight.images, 540, 300, 'contain');
                                return imgUrl ? (
                                  <img src={imgUrl} alt={spotlight.name} loading="lazy" decoding="async" className="w-full h-full object-contain object-center" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-muted">
                                    <Package className="h-8 w-8 text-muted-foreground/30" />
                                  </div>
                                );
                              })()}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                              <div className="absolute bottom-0 inset-x-0 p-2.5 sm:p-4">
                                <h4 className="text-foreground font-bold text-xs sm:text-base line-clamp-1 group-hover:text-primary transition-colors">{spotlight.name}</h4>
                                <SpotlightPrice product={spotlight} />
                              </div>
                            </div>
                            {/* Store strip */}
                            <div className="h-7 flex items-center gap-1.5 px-2.5 bg-muted/60">
                              {spotlight.stores?.logo_url && (
                                <img src={optimizeImageUrl(spotlight.stores.logo_url, 14, 14, 'contain')} alt="" width={14} height={14} loading="lazy" decoding="async" className="h-3.5 w-3.5 rounded-sm object-cover flex-shrink-0" />
                              )}
                              <span className="text-[10px] text-muted-foreground font-medium truncate">{spotlight.stores?.name}</span>
                              {spotlight.stores?.is_verified && <ShieldCheck className="h-3 w-3 text-blue-400 flex-shrink-0" />}
                              {spotlight.stores?.is_trusted && <Award className="h-3 w-3 text-amber-400 flex-shrink-0" />}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                    {/* 9 products in rows of 3 */}
                    {gridProducts.length > 0 && (
                      <div className="grid grid-cols-3 gap-3 sm:gap-6">
                        {gridProducts.map((product) => (
                          <MarketplaceProductCard key={product.id} product={product} />
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No products available yet.
            </div>
          )}
          <div className="text-center pt-4">
            <Button asChild variant="outline" size="lg">
              <Link to="/products">
                View All Products
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </>
      )}

      {/* === CATEGORIES MODE === */}
      {browseMode === 'categories' && (
        <CategoriesGrid />
      )}
    </section>
  );
});
