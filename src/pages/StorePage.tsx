import { useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StoreLayout } from '@/components/store/StoreLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductCard } from '@/components/ui/ProductCard';
import { FollowButton } from '@/components/store/FollowButton';
import { StoreRecommendations } from '@/components/store/StoreRecommendations';
import { StoreReviews } from '@/components/store/StoreReviews';
import { useSellerAnalytics } from '@/hooks/useSellerAnalytics';
import { 
  Store as StoreIcon, 
  CheckCircle, 
  Star,
  Package,
  ShoppingCart,
  ArrowLeft,
  LayoutGrid,
  Users
} from 'lucide-react';

// Theme configurations
const getThemeStyles = (theme: string, accentColor: string) => {
  const baseStyles = {
    banner: '',
    header: '',
    card: '',
    accent: accentColor,
  };

  switch (theme) {
    case 'minimal':
      return {
        ...baseStyles,
        banner: 'h-24 md:h-32',
        header: 'bg-background border-0 shadow-none',
        card: 'border-0 shadow-sm',
      };
    case 'bold':
      return {
        ...baseStyles,
        banner: 'h-32 md:h-44',
        header: 'bg-card border-2',
        card: 'border-2 hover:border-primary transition-colors',
      };
    case 'gradient':
      return {
        ...baseStyles,
        banner: 'h-28 md:h-40',
        header: 'bg-gradient-to-r from-card to-muted border-0',
        card: 'bg-gradient-to-br from-card to-muted/50',
      };
    case 'dark':
      return {
        ...baseStyles,
        banner: 'h-28 md:h-40',
        header: 'bg-zinc-900 text-white border-zinc-800',
        card: 'bg-zinc-900 border-zinc-800',
      };
    default:
      return {
        ...baseStyles,
        banner: 'h-28 md:h-40',
        header: '',
        card: '',
      };
  }
};

export default function StorePage() {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab');
  const [bioExpanded, setBioExpanded] = useState(false);

  // Fetch store details first to get the ID for analytics
  const { data: store, isLoading: storeLoading, error } = useQuery({
    queryKey: ['public-store', storeSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('slug', storeSlug)
        .eq('is_active', true)
        .eq('status', 'approved')
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!storeSlug,
  });

  // Track analytics - this will auto-track store views
  const { trackProductView } = useSellerAnalytics(store?.id);


  // Fetch store tabs
  const { data: storeTabs } = useQuery({
    queryKey: ['store-tabs-public', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from('store_tabs')
        .select('id, name, slug, icon')
        .eq('store_id', store.id)
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
    enabled: !!store?.id,
  });

  // Fetch tab product IDs if a tab is selected
  const { data: tabProductIds } = useQuery({
    queryKey: ['tab-product-ids', store?.id, activeTab],
    queryFn: async () => {
      if (!store?.id || !activeTab) return null;
      
      // Find the tab by slug
      const tab = storeTabs?.find(t => t.slug === activeTab);
      if (!tab) return null;

      const { data, error } = await supabase
        .from('store_tab_products')
        .select('product_id')
        .eq('tab_id', tab.id);
      
      if (error) throw error;
      return data.map(p => p.product_id);
    },
    enabled: !!store?.id && !!activeTab && !!storeTabs,
  });

  // Fetch store products
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['store-products', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name)')
        .eq('store_id', store.id)
        .eq('is_active', true)
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!store?.id,
  });

  // Filter products based on active tab
  const filteredProducts = activeTab && tabProductIds 
    ? products?.filter(p => tabProductIds.includes(p.id))
    : products;

  const handleTabClick = (tabSlug: string | null) => {
    if (tabSlug) {
      setSearchParams({ tab: tabSlug });
    } else {
      setSearchParams({});
    }
  };

  if (storeLoading) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-background">
        <div className="container py-8">
          <Skeleton className="h-48 w-full mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-background items-center justify-center">
        <div className="container py-16 text-center">
          <StoreIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h1 className="text-2xl font-bold mb-2">Store Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The store you're looking for doesn't exist or is no longer available.
          </p>
          <Button asChild>
            <Link to="/products">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Browse Products
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const theme = store.theme || 'default';
  const accentColor = store.accent_color || '#8b5cf6';
  const bio = store.bio;
  const themeStyles = getThemeStyles(theme, accentColor);
  const isDarkTheme = theme === 'dark';

  return (
    <StoreLayout 
      store={{
        id: store.id,
        slug: store.slug || storeSlug || '',
        name: store.name,
        logo_url: store.logo_url,
        accent_color: accentColor,
        discord_url: store.discord_url,
        twitter_url: store.twitter_url,
        youtube_url: store.youtube_url,
        tiktok_url: store.tiktok_url,
        website_url: store.website_url,
      }}
      tabs={storeTabs || []}
      activeTab={activeTab}
      onTabChange={handleTabClick}
      productCount={store.product_count || 0}
      totalSales={store.total_sales || 0}
      averageRating={store.average_rating}
      bio={bio}
    >
      {/* Store Banner */}
      <div className="relative">
        {store.banner_url ? (
          <div 
            className={`${themeStyles.banner} bg-cover bg-center`}
            style={{ backgroundImage: `url(${store.banner_url})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
          </div>
        ) : theme === 'gradient' ? (
          <div 
            className={themeStyles.banner}
            style={{ 
              background: `linear-gradient(135deg, ${accentColor}30 0%, ${accentColor}10 50%, transparent 100%)` 
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
          </div>
        ) : theme === 'bold' ? (
          <div 
            className={`${themeStyles.banner} relative overflow-hidden`}
            style={{ backgroundColor: `${accentColor}15` }}
          >
            <div 
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `repeating-linear-gradient(45deg, ${accentColor} 0, ${accentColor} 1px, transparent 0, transparent 50%)`,
                backgroundSize: '20px 20px',
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
          </div>
        ) : theme === 'dark' ? (
          <div className={`${themeStyles.banner} bg-zinc-950`}>
            <div 
              className="absolute inset-0"
              style={{
                background: `radial-gradient(ellipse at top, ${accentColor}20 0%, transparent 70%)`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
          </div>
        ) : theme === 'minimal' ? (
          <div className={`${themeStyles.banner} bg-muted/30`} />
        ) : (
          <div className="h-28 md:h-40 bg-gradient-to-br from-primary/20 to-primary/5">
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
          </div>
        )}
      </div>

      <div className="container -mt-16 relative z-10">
        {/* Store Header */}
        <Card className={`mb-8 ${themeStyles.header}`}>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-6 items-center text-center">
              {/* Store Logo */}
              <div 
                className="h-24 w-24 rounded-xl border-4 border-background flex items-center justify-center overflow-hidden flex-shrink-0"
                style={{ 
                  backgroundColor: store.logo_url ? 'transparent' : `${accentColor}20`,
                  borderColor: theme === 'bold' ? accentColor : undefined,
                }}
              >
                {store.logo_url ? (
                  <img 
                    src={store.logo_url} 
                    alt={store.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <StoreIcon 
                    className="h-10 w-10" 
                    style={{ color: accentColor }}
                  />
                )}
              </div>

              {/* Store Info */}
              <div className="flex-1">
                <div className="flex items-center justify-center gap-3 mb-2 flex-wrap">
                  <h1 className={`text-2xl md:text-3xl font-bold ${isDarkTheme ? 'text-white' : ''}`}>
                    {store.name}
                  </h1>
                  {store.is_verified && (
                    <Badge 
                      className="gap-1"
                      style={{ backgroundColor: accentColor, color: 'white' }}
                    >
                      <CheckCircle className="h-3 w-3" />
                      Verified
                    </Badge>
                  )}
                  <FollowButton 
                    storeId={store.id} 
                    accentColor={accentColor}
                    size="sm"
                  />
                </div>
                
                {store.description && (
                  <p className={`mb-2 text-center max-w-2xl mx-auto ${isDarkTheme ? 'text-zinc-300' : 'text-muted-foreground'}`}>
                    {store.description}
                  </p>
                )}

                {bio && (
                  <div id="store-about" className={`text-sm italic mb-4 max-w-2xl mx-auto text-center ${isDarkTheme ? 'text-zinc-400' : 'text-muted-foreground'}`}>
                    {bio.length > 100 && !bioExpanded ? (
                      <>
                        "{bio.slice(0, 100)}..."
                        <button
                          onClick={() => setBioExpanded(true)}
                          className="ml-1 text-xs font-medium not-italic hover:underline"
                          style={{ color: accentColor }}
                        >
                          See more
                        </button>
                      </>
                    ) : (
                      <>
                        "{bio}"
                        {bio.length > 100 && (
                          <button
                            onClick={() => setBioExpanded(false)}
                            className="ml-1 text-xs font-medium not-italic hover:underline"
                            style={{ color: accentColor }}
                          >
                            See less
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Stats */}
                <div className={`flex flex-wrap justify-center gap-6 text-sm ${isDarkTheme ? 'text-zinc-300' : ''}`}>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" style={{ color: isDarkTheme ? accentColor : undefined }} />
                    <span>{store.product_count || 0} Products</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" style={{ color: isDarkTheme ? accentColor : undefined }} />
                    <span>{store.total_sales || 0} Sales</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" style={{ color: isDarkTheme ? accentColor : undefined }} />
                    <span>{store.follower_count || 0} Followers</span>
                  </div>
                  {store.average_rating && (
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span>{store.average_rating.toFixed(1)} Rating</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Section */}
        <div id="store-products" className="mb-8 scroll-mt-20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Products</h2>
          </div>

          {/* Store Tabs (shown inline on desktop when sidebar is visible) */}
          {storeTabs && storeTabs.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6 md:hidden">
              <Button
                variant={!activeTab ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleTabClick(null)}
                style={!activeTab ? { backgroundColor: accentColor } : undefined}
              >
                <LayoutGrid className="h-4 w-4 mr-1.5" />
                All
              </Button>
              {storeTabs.map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.slug ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTabClick(tab.slug)}
                  style={activeTab === tab.slug ? { backgroundColor: accentColor } : undefined}
                >
                  {tab.name}
                </Button>
              ))}
            </div>
          )}
          
          {productsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-64" />
              ))}
            </div>
          ) : filteredProducts && filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product: any) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  price={product.price}
                  image={product.images?.[0] || '/placeholder.svg'}
                  slug={product.slug}
                  category={(product.categories as any)?.name}
                />
              ))}
            </div>
          ) : activeTab ? (
            <Card className={themeStyles.card}>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Products in This Category</h3>
                <p className="text-muted-foreground mb-4">
                  There are no products in this category yet.
                </p>
                <Button variant="outline" onClick={() => handleTabClick(null)}>
                  View All Products
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className={themeStyles.card}>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Products Yet</h3>
                <p className="text-muted-foreground">
                  This store hasn't listed any products yet. Check back soon!
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Reviews Section */}
        {store && (
          <div className="mb-8">
            <StoreReviews
              storeId={store.id}
              storeName={store.name}
              accentColor={accentColor}
              averageRating={store.average_rating}
            />
          </div>
        )}

        {/* Recommendations Section */}
        {store && products && products.length > 0 && (
          <div id="store-recommendations" className="scroll-mt-20">
            <StoreRecommendations
              storeId={store.id}
              storeName={store.name}
              categoryIds={[...new Set(products.map(p => p.category_id).filter(Boolean))] as string[]}
              accentColor={accentColor}
              limit={4}
            />
          </div>
        )}
      </div>
    </StoreLayout>
  );
}
