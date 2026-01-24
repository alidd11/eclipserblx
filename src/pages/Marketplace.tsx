import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Store, ChevronRight, ShieldCheck, Award, Users, Search, X, Package, FlaskConical } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useMarketplaceAccess } from '@/hooks/useFeatureFlag';
import { FeaturedProductsCard } from '@/components/home/FeaturedProductsCard';
import { TopSellersCard } from '@/components/marketplace/TopSellersCard';
import { NewArrivalsCard } from '@/components/marketplace/NewArrivalsCard';
import { CategoriesGridCard } from '@/components/marketplace/CategoriesGridCard';
import { BecomeSellerCard } from '@/components/account/BecomeSellerCard';

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

interface ProductResult {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[] | null;
  stores: { name: string; slug: string } | null;
}

function StoreCard({ store, showTestingBadge }: { store: StoreData; showTestingBadge?: boolean }) {
  const accentColor = store.accent_color || '#8B5CF6';
  
  return (
    <Link to={`/store/${store.slug}`}>
      <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden h-full border-border/50 hover:border-primary/30">
        {/* Banner */}
        <div 
          className="h-20 relative overflow-hidden"
          style={{ 
            background: store.banner_url 
              ? `url(${store.banner_url}) center/cover` 
              : `linear-gradient(135deg, ${accentColor}40, ${accentColor}20)`
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          {/* Testing Badge */}
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
          {/* Logo */}
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
                  <Badge 
                    className="text-[10px] px-1.5 py-0 gap-0.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0"
                  >
                    <Award className="h-2.5 w-2.5" />
                    Trusted
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          {/* Description */}
          {store.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
              {store.description}
            </p>
          )}
          
          {/* Footer */}
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

export default function Marketplace() {
  const navigate = useNavigate();
  const { hasAccess, isAdmin, isMarketplacePublic, loading: accessLoading } = useMarketplaceAccess();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  // Fetch all approved stores (filter testing stores for non-admins)
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
      
      // Non-admins can't see testing stores
      if (!isAdmin) {
        query = query.eq('is_testing', false);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as (StoreData & { is_testing?: boolean })[];
    },
    enabled: hasAccess,
  });

  // Search products when query is present
  const { data: searchProducts, isLoading: searchProductsLoading } = useQuery({
    queryKey: ['marketplace-search-products', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return [];
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('products')
        .select('id, name, slug, price, images, stores (name, slug, is_active)')
        .eq('is_active', true)
        .or(`release_at.is.null,release_at.lte.${now}`)
        .ilike('name', `%${debouncedQuery}%`)
        .limit(10);
      
      if (error) throw error;
      // Include products without stores (Eclipse main store) or with active stores
      const filtered = (data || []).filter(p => !p.stores || p.stores.is_active !== false);
      return filtered as unknown as ProductResult[];
    },
    enabled: hasAccess && debouncedQuery.length >= 2,
  });

  // Filter stores based on search query
  const filteredStores = useMemo(() => {
    if (!stores) return [];
    if (!debouncedQuery.trim()) return stores;
    
    const query = debouncedQuery.toLowerCase();
    return stores.filter(store => 
      store.name.toLowerCase().includes(query) ||
      store.description?.toLowerCase().includes(query)
    );
  }, [stores, debouncedQuery]);

  const isSearching = debouncedQuery.length >= 2;
  // Only redirect if marketplace is public but user lacks specific access
  // When private, everyone can see the "Coming Soon" page
  useEffect(() => {
    if (!accessLoading && isMarketplacePublic && !hasAccess) {
      navigate('/', { replace: true });
    }
  }, [accessLoading, hasAccess, isMarketplacePublic, navigate]);

  // Show nothing while checking access
  if (accessLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Don't render if marketplace is public but no access (will redirect)
  if (!hasAccess && isMarketplacePublic) {
    return null;
  }

  const isLoading = storesLoading;
  
  // Use filtered stores when searching, otherwise use all stores
  const storesList = isSearching ? filteredStores : (stores || []);
  
  // Split stores into rows of varying sizes for responsive grid
  // First store shows at the very top, then rows = 8 stores (on large screens), then remaining stores
  const firstBatchStores = storesList.slice(0, 9);
  const remainingStores = storesList.slice(9);
  // Stores to show in the grid (excluding the featured first store)
  const gridStores = storesList.slice(1, 9);
  const gridRemainingStores = storesList.slice(9);

  // Show seller application process if marketplace is not public (for non-admin users)
  if (!isMarketplacePublic && !isAdmin) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-6 sm:py-8 space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Store className="h-4 w-4" />
              Eclipse Marketplace
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
              Coming Soon
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
              The Eclipse Marketplace is preparing for launch. Want to be one of our first sellers? 
              Apply now to set up your store and be ready when we go live!
            </p>
          </div>

          {/* Seller Application Section */}
          <div className="max-w-2xl mx-auto">
            <BecomeSellerCard />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 sm:py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Store className="h-4 w-4" />
            Eclipse Marketplace
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
            Discover Amazing Stores
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
            Browse our curated collection of verified sellers offering premium digital assets, 
            scripts, and resources for your projects.
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search stores and products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 h-12 text-base bg-muted/50 border-muted-foreground/20 focus:border-primary"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Search Results */}
        {isSearching && (
          <div className="space-y-6">
            {/* Product Results */}
            {(searchProducts && searchProducts.length > 0) && (
              <section>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Products matching "{debouncedQuery}"
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {searchProducts.map((product) => (
                    <Link
                      key={product.id}
                      to={`/product/${product.slug}`}
                      className="group"
                    >
                      <Card className="overflow-hidden hover:shadow-md transition-all h-full">
                        <div className="aspect-square relative bg-muted">
                          {product.images?.[0] ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-8 w-8 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>
                        <CardContent className="p-3">
                          <p className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">
                            {product.name}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {product.stores?.name}
                          </p>
                          <p className="text-sm font-semibold text-primary mt-1">
                            £{product.price.toFixed(2)}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
                {searchProducts.length >= 6 && (
                  <div className="text-center mt-3">
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/products?search=${encodeURIComponent(debouncedQuery)}`}>
                        View all product results
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  </div>
                )}
              </section>
            )}

            {/* Store Results Header */}
            {filteredStores.length > 0 && (
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" />
                Stores matching "{debouncedQuery}" ({filteredStores.length})
              </h2>
            )}

            {/* No Results */}
            {filteredStores.length === 0 && (!searchProducts || searchProducts.length === 0) && !searchProductsLoading && (
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">No stores or products found for "{debouncedQuery}"</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Try a different search term
                </p>
              </div>
            )}
          </div>
        )}

        {/* Eclipse Main Store - Show at very top when not searching */}
        {!isSearching && firstBatchStores.length > 0 && (
          <section>
            <StoreCard store={firstBatchStores[0]} showTestingBadge={isAdmin} />
          </section>
        )}

        {/* Featured Products & Top Seller - Show at top when not searching */}
        {!isSearching && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2">
              <FeaturedProductsCard />
            </div>
            <TopSellersCard />
          </section>
        )}

        {/* New Arrivals & Categories Cards - Hide when searching */}
        {!isSearching && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <NewArrivalsCard />
            <CategoriesGridCard />
          </section>
        )}

        {/* Grid of stores (excluding the featured first store) */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <StoreCardSkeleton key={i} />
              ))
            ) : gridStores.length > 0 ? (
              gridStores.map((store) => (
                <StoreCard key={store.id} store={store} showTestingBadge={isAdmin} />
              ))
            ) : !isSearching && firstBatchStores.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Store className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">No stores available yet.</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Check back soon for amazing sellers!
                </p>
              </div>
            ) : null}
          </div>
        </section>


        {/* Remaining stores */}
        {gridRemainingStores.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4">More Stores</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {gridRemainingStores.map((store) => (
                <StoreCard key={store.id} store={store} showTestingBadge={isAdmin} />
              ))}
            </div>
          </section>
        )}

        {/* View All Products CTA */}
        <div className="text-center pt-4">
          <Button asChild variant="outline" size="lg">
            <Link to="/products">
              View All Products
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
