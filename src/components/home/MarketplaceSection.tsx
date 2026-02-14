import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Store, ChevronRight, ShieldCheck, Award, Users, Search, Package, FlaskConical, Crown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
import { useFeaturedProducts } from '@/hooks/useFeaturedProducts';
import { useSubscription } from '@/hooks/useSubscription';

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

function StoreCard({ store, showTestingBadge }: { store: StoreData; showTestingBadge?: boolean }) {
  const accentColor = store.accent_color || '#8B5CF6';
  
  return (
    <Link to={`/store/${store.slug}`}>
      <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden h-full border-border/50 hover:border-primary/30">
        <div 
          className="h-20 relative overflow-hidden"
          style={{ 
            background: store.banner_url 
              ? `url(${store.banner_url}) center/cover` 
              : `linear-gradient(135deg, ${accentColor}40, ${accentColor}20)`
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          {showTestingBadge && store.is_testing && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-orange-500/90 text-white border-0 text-[10px] gap-1">
                <FlaskConical className="h-2.5 w-2.5" />
                Testing
              </Badge>
            </div>
          )}
        </div>
        
        <CardContent className="pt-0 -mt-8 relative">
          <div className="flex items-start gap-3 mb-3">
            {store.logo_url ? (
              <img 
                src={store.logo_url} 
                alt={store.name}
                className="h-14 w-14 rounded-lg object-contain bg-background shadow-md flex-shrink-0"
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
              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                {store.is_verified && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5">
                    <ShieldCheck className="h-2.5 w-2.5" />
                    Verified
                  </Badge>
                )}
                {store.is_trusted && (
                  <Badge className="text-[10px] px-1.5 py-0 gap-0.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0">
                    <Award className="h-2.5 w-2.5" />
                    Trusted
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
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
        </CardContent>
      </Card>
    </Link>
  );
}

function StoreCardSkeleton() {
  return (
    <Card className="overflow-hidden h-full">
      <Skeleton className="h-20 rounded-none" />
      <CardContent className="pt-0 -mt-8 relative">
        <div className="flex items-start gap-3 mb-3">
          <Skeleton className="h-14 w-14 rounded-lg flex-shrink-0" />
          <div className="flex-1 pt-4 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-8 w-full mb-3" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}

function MarketplaceProductCard({ product }: { product: { id: string; name: string; slug: string; price: number; images: string[] | null; category_id: string | null; is_resellable: boolean; stores: { name: string; logo_url: string | null; is_verified: boolean; is_trusted: boolean; eclipse_plus_discount_enabled: boolean } | null } }) {
  const { formatPrice } = useCurrency();
  const { getMemberPrice, getDiscountPercent, isEligibleForDiscount } = useSubscription();

  const isEligible = isEligibleForDiscount(product.category_id, product.is_resellable, product.stores?.eclipse_plus_discount_enabled);
  const memberPrice = getMemberPrice(product.price, product.category_id, product.is_resellable);
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
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2">
            <div className="flex items-center gap-1">
              {product.stores?.logo_url && (
                <img src={product.stores.logo_url} alt="" className="h-4 w-4 rounded object-contain bg-white/10" />
              )}
              <span className="text-white text-[11px] font-medium truncate">{product.stores?.name}</span>
              {product.stores?.is_verified && <ShieldCheck className="h-3 w-3 text-blue-400 flex-shrink-0" />}
              {product.stores?.is_trusted && <Award className="h-3 w-3 text-amber-400 flex-shrink-0" />}
            </div>
          </div>
        </div>
        <div className="p-3">
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
}

export function MarketplaceSection() {
  const { hasAccess, isAdmin, isMarketplacePublic, loading: accessLoading } = useMarketplaceAccess();
  const [browseMode, setBrowseMode] = useState<'stores' | 'products'>('stores');
  const { formatPrice } = useCurrency();

  // Fetch all approved stores
  const { data: stores, isLoading: storesLoading } = useQuery({
    queryKey: ['marketplace-stores', isAdmin],
    queryFn: async () => {
      let query = supabase
        .from('stores')
        .select('id, name, slug, description, logo_url, banner_url, accent_color, is_verified, is_trusted, follower_count, is_testing')
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
      return data as (StoreData & { is_testing?: boolean })[];
    },
    enabled: hasAccess,
  });

  // Featured products for products mode
  const { data: featuredProducts, isLoading: productsLoading } = useFeaturedProducts({
    limit: 12,
    maxPerStore: 2,
    queryKey: 'marketplace-products',
  });

  if (accessLoading) {
    return null;
  }

  // Coming soon for non-admin non-public
  if (!isMarketplacePublic && !isAdmin) {
    return (
      <section className="container mx-auto px-4 py-6 sm:py-8 space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Store className="h-4 w-4" />
            Eclipse Marketplace
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">Coming Soon</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
            The Eclipse Marketplace is preparing for launch. Want to be one of our first sellers? 
            Apply now to set up your store and be ready when we go live!
          </p>
        </div>
        <div className="max-w-2xl mx-auto">
          <BecomeSellerCard />
        </div>
      </section>
    );
  }

  if (!hasAccess && isMarketplacePublic) {
    return null;
  }

  const storesList = stores || [];
  const topStoreIds = new Set(storesList.slice(0, 3).map(s => s.id));
  const allStores = storesList.filter(s => !topStoreIds.has(s.id));

  return (
    <section className="container mx-auto px-4 py-6 sm:py-8 space-y-8">
      {/* Browse Mode Toggle */}
      <MarketplaceBrowseToggle mode={browseMode} onChange={setBrowseMode} />

      {/* === STORES MODE === */}
      {browseMode === 'stores' && (
        <>
          <TopStoresSection />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {storesLoading ? (
              Array.from({ length: 9 }).map((_, i) => (
                <StoreCardSkeleton key={i} />
              ))
            ) : allStores.length > 0 ? (
              allStores.map((store) => (
                <StoreCard key={store.id} store={store} showTestingBadge={isAdmin} />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <Store className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">No stores available yet.</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Check back soon for amazing sellers!</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* === PRODUCTS MODE === */}
      {browseMode === 'products' && (
        <>
          <RecentReleasesCarousel />
          <div>
            <h2 className="text-lg font-semibold mb-3">Featured Products</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {productsLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-lg border border-border overflow-hidden">
                    <Skeleton className="aspect-[4/3]" />
                    <div className="p-3 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/3" />
                    </div>
                  </div>
                ))
              ) : featuredProducts?.length ? (
                featuredProducts.map((product) => (
                  <MarketplaceProductCard key={product.id} product={product} />
                ))
              ) : (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  No products available yet.
                </div>
              )}
            </div>
          </div>
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
    </section>
  );
}
