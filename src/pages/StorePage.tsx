import { useState, useCallback, useEffect } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { optimizeImageUrl } from '@/utils/optimizeImageUrl';
import { StoreLayout } from '@/components/store/StoreLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductCard } from '@/components/ui/ProductCard';
import { FollowButton } from '@/components/store/FollowButton';
import { StoreRecommendations } from '@/components/store/StoreRecommendations';
import { StoreReviews } from '@/components/store/StoreReviews';
import { StoreCustomSections } from '@/components/store/StoreCustomSections';
import { StoreFloatingHeader } from '@/components/store/StoreFloatingHeader';

import { StoreTrustSignals } from '@/components/store/StoreTrustSignals';
import { StoreBestSellers } from '@/components/store/StoreBestSellers';
import { useSellerAnalytics } from '@/hooks/useSellerAnalytics';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { PUBLIC_STORE_COLUMNS } from '@/lib/storeColumns';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  Store as StoreIcon, 
  CheckCircle, 
  Star,
  Package,
  ShoppingCart,
  ArrowLeft,
  Users,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Megaphone
} from 'lucide-react';
import { usePageTracking } from '@/hooks/usePageTracking';
import { usePageMeta } from '@/hooks/usePageMeta';
import { StoreSchema, BreadcrumbSchema } from '@/components/seo/StructuredData';

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

const PRODUCTS_PER_PAGE_MOBILE = 12;
const PRODUCTS_PER_PAGE_DESKTOP = 8;

export default function StorePage() {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  usePageTracking({ pagePath: `/store/${storeSlug}` });
  
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const activeTab = searchParams.get('tab');
  const [bioExpanded, setBioExpanded] = useState(false);
  const [currentProductPage, setCurrentProductPage] = useState(0);

  const CURRENT_TOS_VERSION = "1.0";

  // Fetch store details first to get the ID for analytics
  const { data: store, isLoading: storeLoading, error } = useQuery({
    queryKey: ['public-store', storeSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select(PUBLIC_STORE_COLUMNS)
        .eq('slug', storeSlug)
        .eq('is_active', true)
        .eq('status', 'approved')
        .single();

      if (error) throw error;

      // Check if store has signed the current TOS version
      const { data: agreement } = await supabase
        .from('seller_agreements')
        .select('id')
        .eq('store_id', data.id)
        .eq('agreement_version', CURRENT_TOS_VERSION)
        .maybeSingle();

      // Store must have signed agreement to be visible
      if (!agreement) {
        throw new Error('Store agreement not signed');
      }

      return data;
    },
    enabled: !!storeSlug,
  });

  // Track analytics - this will auto-track store views
  const { trackProductView } = useSellerAnalytics(store?.id);

  // Check if current user is the store owner and if Stripe onboarding is incomplete
  const isStoreOwner = user?.id === store?.owner_id;
  const { data: stripeOnboardingIncomplete } = useQuery({
    queryKey: ['store-onboarding-status', store?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_payment_details')
        .select('details_submitted, stripe_account_id')
        .eq('store_id', store!.id)
        .maybeSingle();
      if (error) return false;
      // Incomplete = has a stripe account but hasn't submitted details
      return data?.stripe_account_id && !data?.details_submitted;
    },
    enabled: !!store?.id && isStoreOwner,
  });

  // All stores now use store_tabs uniformly - no special Eclipse Store handling

  // Fetch store tabs (custom categories created by seller)
  const { data: storeTabs } = useQuery({
    queryKey: ['store-tabs-public', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      
      // All stores use store_tabs
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

  // Fetch enabled global categories for this store
  const { data: enabledGlobalCategories } = useQuery({
    queryKey: ['store-global-categories', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      
      const { data, error } = await supabase
        .from('store_categories')
        .select(`
          id,
          category_id,
          display_order,
          categories:category_id (
            id,
            name,
            slug,
            icon
          )
        `)
        .eq('store_id', store.id)
        .eq('is_enabled', true)
        .order('display_order');
      
      if (error) throw error;
      
      // Transform to match StoreTabs interface
      return (data || [])
        .filter(sc => sc.categories)
        .map(sc => ({
          id: sc.categories.id,
          name: sc.categories.name,
          slug: sc.categories.slug,
          icon: sc.categories.icon,
          isGlobalCategory: true,
        }));
    },
    enabled: !!store?.id,
  });

  // Combine store tabs with global categories, deduplicating by slug
  const storeTabSlugs = new Set((storeTabs || []).map(t => t.slug));
  const allTabs = [
    ...(storeTabs || []).map(t => ({ ...t, isGlobalCategory: false })),
    ...(enabledGlobalCategories || []).filter(gc => !storeTabSlugs.has(gc.slug)),
  ];

  // Fetch tab product IDs if a custom tab is selected
  const { data: tabProductIds, isLoading: tabProductsLoading } = useQuery({
    queryKey: ['tab-product-ids', store?.id, activeTab, storeTabs?.map(t => t.id).join(',')],
    queryFn: async () => {
      if (!store?.id || !activeTab || !storeTabs) return null;
      
      // Find the tab by slug in custom store tabs only
      const tab = storeTabs.find(t => t.slug === activeTab);
      if (!tab) {
        return null;
      }

      // Use store_tab_products join table for all stores
      const { data, error } = await supabase
        .from('store_tab_products')
        .select('product_id')
        .eq('tab_id', tab.id);
      
      if (error) throw error;
      return data.map(p => p.product_id);
    },
    enabled: !!store?.id && !!activeTab && !!storeTabs && storeTabs.length > 0 && 
             !enabledGlobalCategories?.some(c => c.slug === activeTab),
  });

  // Fetch store products with caching
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['store-products', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(id, name, slug)')
        .eq('store_id', store.id)
        .eq('is_active', true)
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!store?.id,
    staleTime: 2 * 60_000,
  });

  // Check if activeTab is a global category
  const activeGlobalCategory = enabledGlobalCategories?.find(c => c.slug === activeTab);

  // Filter products based on active tab (custom tab or global category)
  const filteredProducts = (() => {
    if (!activeTab) return products;
    
    // If it's a global category, filter by category_id
    if (activeGlobalCategory) {
      return products?.filter(p => p.categories?.slug === activeTab);
    }
    
    // If it's a custom store tab, filter by tabProductIds
    if (tabProductIds) {
      return products?.filter(p => tabProductIds.includes(p.id));
    }
    
    return products;
  })();


  const handleTabClick = (tabSlug: string | null) => {
    if (tabSlug) {
      setSearchParams({ tab: tabSlug });
    } else {
      setSearchParams({});
    }
    setCurrentProductPage(0);
  };

  // Pagination logic for products
  const productsPerPage = isMobile ? PRODUCTS_PER_PAGE_MOBILE : PRODUCTS_PER_PAGE_DESKTOP;
  const totalProductPages = filteredProducts ? Math.ceil(filteredProducts.length / productsPerPage) : 0;
  const paginatedProducts = filteredProducts?.slice(
    currentProductPage * productsPerPage,
    (currentProductPage + 1) * productsPerPage
  );

  const goToNextPage = useCallback(() => {
    if (totalProductPages > 1) {
      setCurrentProductPage((prev) => (prev + 1) % totalProductPages);
    }
  }, [totalProductPages]);

  const goToPrevPage = useCallback(() => {
    if (totalProductPages > 1) {
      setCurrentProductPage((prev) => (prev - 1 + totalProductPages) % totalProductPages);
    }
  }, [totalProductPages]);

  // Dynamic SEO meta — reactively updates when store data loads
  usePageMeta({
    title: store?.name ? `${store.name} Store` : storeSlug ? `${storeSlug} Store` : 'Store',
    description: store?.description
      ? store.description.slice(0, 155)
      : store?.name
        ? `Browse products from ${store.name} on Eclipse marketplace`
        : undefined,
    canonicalPath: storeSlug ? `/store/${storeSlug}` : undefined,
    ogImage: store?.logo_url || store?.banner_url || undefined,
  });

  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: goToNextPage,
    onSwipeRight: goToPrevPage,
    minSwipeDistance: 50,
  });

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
    <>
    <BreadcrumbSchema items={[
      { name: 'Home', url: 'https://eclipserblx.com/' },
      { name: 'Stores', url: 'https://eclipserblx.com/stores' },
      { name: store.name, url: `https://eclipserblx.com/store/${store.slug || storeSlug}` },
    ]} />
    <StoreSchema
      name={store.name}
      description={store.description || undefined}
      url={`${window.location.origin}/store/${store.slug || storeSlug}`}
      image={store.logo_url || undefined}
      rating={store.average_rating || undefined}
    />
    <StoreLayout 
      store={{
        id: store.id,
        slug: store.slug || storeSlug || '',
        name: store.name,
        logo_url: store.logo_url,
        banner_url: store.banner_url,
        accent_color: accentColor,
        discord_url: store.discord_url,
        twitter_url: store.twitter_url,
        youtube_url: store.youtube_url,
        tiktok_url: store.tiktok_url,
        website_url: store.website_url,
      }}
      tabs={allTabs}
      activeTab={activeTab}
      onTabChange={handleTabClick}
      productCount={store.product_count || 0}
      totalSales={store.total_sales || 0}
      averageRating={store.average_rating}
      bio={bio}
    >
      <StoreFloatingHeader
        storeName={store.name}
        logoUrl={store.logo_url}
        storeId={store.id}
        accentColor={accentColor}
        onMessage={() => {
          if (!user) {
            navigate('/auth?redirect=' + encodeURIComponent(`/store/${storeSlug}`));
            return;
          }
          navigate(`/store-messages?store=${store.id}`);
        }}
      />
      {/* Store Banner - with scheduling */}
      {(() => {
        const now = new Date();
        const bannerStart = (store as any).banner_start_at ? new Date((store as any).banner_start_at) : null;
        const bannerEnd = (store as any).banner_end_at ? new Date((store as any).banner_end_at) : null;
        const showBanner = (!bannerStart || now >= bannerStart) && (!bannerEnd || now <= bannerEnd);
        
        if (!showBanner) return <div className="h-8" />;
        
        return (
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
          <div className="h-28 md:h-40 bg-muted/30">
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
          </div>
        )}
      </div>
        );
      })()}


      {/* Store Header - Transparent overlay on banner */}
      <div className="container px-4 -mt-16 relative z-10">
        <div className="flex flex-col gap-6 items-center text-center py-6">
          {/* Store Logo */}
          {store.logo_url ? (
            <img 
              src={optimizeImageUrl(store.logo_url, 96, 96, 'contain')} 
              alt={store.name}
              width={96}
              height={96}
              className="h-24 w-24 object-contain flex-shrink-0 drop-shadow-lg"
            />
          ) : (
            <div 
              className="h-24 w-24 rounded-xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm"
              style={{ backgroundColor: `${accentColor}40` }}
            >
              <StoreIcon 
                className="h-10 w-10" 
                style={{ color: accentColor }}
              />
            </div>
          )}

          {/* Store Info */}
          <div className="flex-1 w-full max-w-4xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold text-center mb-2 drop-shadow-md text-foreground">
              {store.name}
            </h1>
            
            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-2 mb-2">
              <FollowButton 
                storeId={store.id} 
                accentColor={accentColor}
                size="sm"
              />
              <Button
                variant="outline"
                size="sm"
                asChild
                className="gap-1.5 shadow-md"
              >
                <Link to={`/store/${store.slug || storeSlug || ''}/reviews`}>
                  <Star className="h-4 w-4" />
                  Reviews
                </Link>
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (!user) {
                    navigate('/auth?redirect=' + encodeURIComponent(`/store/${storeSlug}`));
                    return;
                  }
                  navigate(`/store-messages?store=${store.id}`);
                }}
                className="gap-1.5 shadow-md"
                style={{ backgroundColor: accentColor, color: 'white' }}
              >
                <MessageCircle className="h-4 w-4" />
                Message
              </Button>
            </div>
            
            {store.description && (
              <p className="mb-2 text-center max-w-2xl mx-auto text-muted-foreground">
                {store.description}
              </p>
            )}

            {bio && (
              <div id="store-about" className="text-sm italic mb-4 max-w-2xl mx-auto text-center text-muted-foreground">
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

            {/* Verified Seller Badge - Above Stats */}
            {store.is_verified && (
              <div className="flex items-center justify-center gap-2 flex-wrap mb-3">
                <Badge 
                  className="gap-1 shadow-md"
                  style={{ backgroundColor: accentColor, color: 'white' }}
                  title="This seller has completed our identity and business verification process"
                >
                  <CheckCircle className="h-3 w-3" />
                  Verified Seller
                </Badge>
              </div>
            )}

            {/* Stats - stretched across */}
            <div className="flex flex-wrap justify-center gap-6 md:gap-12 text-sm pt-2">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{store.product_count || 0} Products</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{store.follower_count || 0} Followers</span>
              </div>
              {store.average_rating && (
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-medium">{store.average_rating.toFixed(1)} Rating</span>
                </div>
              )}
            </div>
            {/* Social proof - join date */}
            {store.created_at && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Selling since {new Date(store.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                {(store.total_sales || 0) > 0 && ` · ${store.total_sales} sales`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* When category is active, show products immediately at top */}
      {activeTab ? (
        <div className="container px-4 mt-4">
          {/* Back to Store Navigation */}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => handleTabClick(null)}
            className="text-muted-foreground hover:text-foreground mb-3 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Store
          </Button>

          {/* Category Products Section - At Top */}
          <div id="store-products" className="mb-8 scroll-mt-20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                {storeTabs?.find(t => t.slug === activeTab)?.name || 'Products'}
              </h2>
              {totalProductPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={goToPrevPage}
                    style={{ borderColor: accentColor, color: accentColor }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {currentProductPage + 1} / {totalProductPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={goToNextPage}
                    style={{ borderColor: accentColor, color: accentColor }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {productsLoading || tabProductsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
                ))}
              </div>
            ) : paginatedProducts && paginatedProducts.length > 0 ? (
              <div
                {...swipeHandlers}
                className="relative overflow-hidden"
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentProductPage}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.3 }}
                    className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
                  >
                    {paginatedProducts.map((product: any) => {
                      const isNewProduct = product.created_at 
                        ? (Date.now() - new Date(product.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000 
                        : false;
                      
                      return (
                        <ProductCard
                          key={product.id}
                          id={product.id}
                          name={product.name}
                          price={product.price}
                          image={product.images?.[0] || '/placeholder.svg'}
                          slug={String((product as any).product_number)}
                          category={(product.categories as any)?.name}
                          isResellable={product.is_resellable}
                          showNewBadge={isNewProduct}
                          createdAt={product.created_at}
                          storeEclipseEnabled={store?.eclipse_plus_discount_enabled}
                        />
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
                
                {/* Page indicators */}
                {totalProductPages > 1 && (
                  <div className="flex justify-center gap-1.5 mt-4">
                    {Array.from({ length: totalProductPages }).map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentProductPage(index)}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          index === currentProductPage ? 'w-6' : 'w-2'
                        }`}
                        style={{
                          backgroundColor: index === currentProductPage ? accentColor : `${accentColor}40`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
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
            )}
          </div>

          {/* Reviews Section - Right after products when category is active */}
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
        </div>
      ) : (
        <>
          {/* Dynamic Store Layout - respects store_layout if set */}
          <div className="container px-4 mt-4">
            {(() => {
              const storeLayout = (store as any)?.store_layout;
              const defaultOrder = [
                'best_sellers', 'products', 'trust_signals', 'custom_sections', 'reviews', 'recommendations'
              ];
              
              const layoutSections = storeLayout?.sections
                ? (storeLayout.sections as Array<{ type: string; visible: boolean; config?: Record<string, any> }>)
                    .filter((s) => s.visible !== false)
                    .map((s) => ({ type: s.type, config: (s.config || {}) as any }))
                : defaultOrder.map(type => ({ type, config: {} as any }));

              // Filter out banner/header since they're rendered structurally above
              const contentSections = layoutSections.filter(
                (s) => s.type !== 'banner' && s.type !== 'header'
              );

              return contentSections.map((section, idx) => {
                switch (section.type) {
                  case 'best_sellers':
                    return (
                      <div key={`section-${section.type}-${idx}`} className="mb-4">
                        <StoreBestSellers
                          storeId={store.id}
                          storeName={store.name}
                          accentColor={accentColor}
                          limit={section.config?.limit ?? 4}
                        />
                      </div>
                    );
                  case 'products':
                    return (
                      <div key={`section-${section.type}-${idx}`} id="store-products" className="mb-8 scroll-mt-20">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-xl font-bold">All Products</h2>
                          {totalProductPages > 1 && (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={goToPrevPage}
                                style={{ borderColor: accentColor, color: accentColor }}
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                              <span className="text-sm text-muted-foreground">
                                {currentProductPage + 1} / {totalProductPages}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={goToNextPage}
                                style={{ borderColor: accentColor, color: accentColor }}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>

                        {productsLoading ? (
                          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                            {[1, 2, 3, 4].map(i => (
                              <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
                            ))}
                          </div>
                        ) : paginatedProducts && paginatedProducts.length > 0 ? (
                          <div
                            {...swipeHandlers}
                            className="relative overflow-hidden"
                          >
                            <AnimatePresence mode="wait">
                              <motion.div
                                key={currentProductPage}
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.3 }}
                                className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
                              >
                                {paginatedProducts.map((product: any) => {
                                  const isNewProduct = product.created_at 
                                    ? (Date.now() - new Date(product.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000 
                                    : false;
                                  
                                  return (
                                    <ProductCard
                                      key={product.id}
                                      id={product.id}
                                      name={product.name}
                                      price={product.price}
                                      image={product.images?.[0] || '/placeholder.svg'}
                                      slug={String((product as any).product_number)}
                                      category={(product.categories as any)?.name}
                                      isResellable={product.is_resellable}
                                      showNewBadge={isNewProduct}
                                      createdAt={product.created_at}
                                      storeEclipseEnabled={store?.eclipse_plus_discount_enabled}
                                    />
                                  );
                                })}
                              </motion.div>
                            </AnimatePresence>
                            
                            {totalProductPages > 1 && (
                              <div className="flex justify-center gap-1.5 mt-4">
                                {Array.from({ length: totalProductPages }).map((_, index) => (
                                  <button
                                    key={index}
                                    onClick={() => setCurrentProductPage(index)}
                                    className={`h-2 rounded-full transition-all duration-300 ${
                                      index === currentProductPage ? 'w-6' : 'w-2'
                                    }`}
                                    style={{
                                      backgroundColor: index === currentProductPage ? accentColor : `${accentColor}40`,
                                    }}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <Card className={themeStyles.card}>
                            <CardContent className="py-12 text-center">
                              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                              <h3 className="text-lg font-medium mb-2">No Products Yet</h3>
                              <p className="text-muted-foreground mb-4">
                                This store hasn't listed any products yet.
                              </p>
                              <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                                <FollowButton 
                                  storeId={store.id} 
                                  accentColor={accentColor}
                                  size="sm"
                                />
                                <Button variant="outline" size="sm" asChild>
                                  <Link to="/stores">Browse Similar Stores</Link>
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    );
                  case 'trust_signals':
                    return (
                      <div key={`section-${section.type}-${idx}`}>
                        <StoreTrustSignals 
                          accentColor={accentColor}
                          isVerified={store.is_verified}
                        />
                      </div>
                    );
                  case 'custom_sections':
                    return store ? (
                      <div key={`section-${section.type}-${idx}`} className="mb-8">
                        <StoreCustomSections storeId={store.id} accentColor={accentColor} />
                      </div>
                    ) : null;
                  case 'reviews':
                    return store ? (
                      <div key={`section-${section.type}-${idx}`} className="mb-8">
                        <StoreReviews
                          storeId={store.id}
                          storeName={store.name}
                          accentColor={accentColor}
                          averageRating={store.average_rating}
                        />
                      </div>
                    ) : null;
                  case 'recommendations':
                    return store && products && products.length > 0 ? (
                      <div key={`section-${section.type}-${idx}`} id="store-recommendations" className="scroll-mt-20">
                        <StoreRecommendations
                          storeId={store.id}
                          storeName={store.name}
                          categoryIds={[...new Set(products.map(p => p.category_id).filter(Boolean))] as string[]}
                          accentColor={accentColor}
                          limit={4}
                        />
                      </div>
                    ) : null;
                  case 'announcement':
                    return section.config?.active && section.config?.text ? (
                      <div
                        key={`section-${section.type}-${idx}`}
                        className="rounded-lg px-4 py-2.5 text-center text-sm font-medium flex items-center justify-center gap-2 mb-4"
                        style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
                      >
                        <Megaphone className="h-4 w-4 shrink-0" />
                        {section.config.text}
                      </div>
                    ) : null;
                  default:
                    return null;
                }
              });
            })()}
          </div>
        </>
      )}
    </StoreLayout>
    </>
  );
}
