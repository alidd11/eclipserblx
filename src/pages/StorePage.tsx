import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { optimizeImageUrl } from '@/utils/optimizeImageUrl';
import { StoreLayout } from '@/components/store/StoreLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FollowButton } from '@/components/store/FollowButton';
import { StoreRecommendations } from '@/components/store/StoreRecommendations';
import { StoreReviews } from '@/components/store/StoreReviews';
import { StoreCustomSections } from '@/components/store/StoreCustomSections';
import { StoreTrustSignals } from '@/components/store/StoreTrustSignals';
import { StoreBestSellers } from '@/components/store/StoreBestSellers';
import { StoreProductGrid } from '@/components/store/StoreProductGrid';
import { useSellerAnalytics } from '@/hooks/useSellerAnalytics';
import { useAuth } from '@/hooks/useAuth';
import { usePublicStore } from '@/hooks/usePublicStore';
import { StoreNotFound } from '@/components/store/StoreNotFound';
import { 
  Store as StoreIcon, 
  CheckCircle, 
  Star,
  Package,
  ArrowLeft,
  Users,
  MessageCircle,
  AlertTriangle,
  Megaphone
} from 'lucide-react';
import { usePageTracking } from '@/hooks/usePageTracking';
import { usePageMeta } from '@/hooks/usePageMeta';
import { StoreSchema, BreadcrumbSchema } from '@/components/seo/StructuredData';

export default function StorePage() {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  usePageTracking({ pagePath: `/store/${storeSlug}` });
  
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const activeTab = searchParams.get('tab');
  const [bioExpanded, setBioExpanded] = useState(false);

  // Fetch store details via centralised hook
  const { store, isLoading: storeLoading, error } = usePublicStore(storeSlug);

  const { trackProductView } = useSellerAnalytics(store?.id);
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
      return data?.stripe_account_id && !data?.details_submitted;
    },
    enabled: !!store?.id && isStoreOwner,
  });

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

  // Fetch enabled global categories
  const { data: enabledGlobalCategories } = useQuery({
    queryKey: ['store-global-categories', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from('store_categories')
        .select(`id, category_id, display_order, categories:category_id (id, name, slug, icon)`)
        .eq('store_id', store.id)
        .eq('is_enabled', true)
        .order('display_order');
      if (error) throw error;
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

  const storeTabSlugs = new Set((storeTabs || []).map(t => t.slug));
  const allTabs = [
    ...(storeTabs || []).map(t => ({ ...t, isGlobalCategory: false })),
    ...(enabledGlobalCategories || []).filter(gc => !storeTabSlugs.has(gc.slug)),
  ];

  // Fetch tab product IDs
  const { data: tabProductIds, isLoading: tabProductsLoading } = useQuery({
    queryKey: ['tab-product-ids', store?.id, activeTab, storeTabs?.map(t => t.id).join(',')],
    queryFn: async () => {
      if (!store?.id || !activeTab || !storeTabs) return null;
      const tab = storeTabs.find(t => t.slug === activeTab);
      if (!tab) return null;
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

  // Fetch store products
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

  const activeGlobalCategory = enabledGlobalCategories?.find(c => c.slug === activeTab);

  const filteredProducts = (() => {
    if (!activeTab) return products;
    if (activeGlobalCategory) return products?.filter(p => p.categories?.slug === activeTab);
    if (tabProductIds) return products?.filter(p => tabProductIds.includes(p.id));
    return products;
  })();

  const handleTabClick = (tabSlug: string | null) => {
    if (tabSlug) {
      setSearchParams({ tab: tabSlug });
    } else {
      setSearchParams({});
    }
  };

  // SEO
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

  if (storeLoading) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-background">
        <div className="container py-8">
          <Skeleton className="h-40 w-full mb-6 rounded-lg" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !store) {
    return <StoreNotFound />;
  }

  const accentColor = store.accent_color || '#8b5cf6';
  const bio = store.bio;

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
        {/* Banner — simplified: image or muted strip */}
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
                  className="h-28 md:h-40 bg-cover bg-center"
                  style={{ backgroundImage: `url(${store.banner_url})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                </div>
              ) : (
                <div className="h-20 md:h-28 bg-muted/30" />
              )}
            </div>
          );
        })()}

        {/* Store Header — left-aligned on desktop, centered on mobile */}
        <div className="container px-4 -mt-12 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end gap-4 py-4">
            {/* Logo */}
            {store.logo_url ? (
              <img
                src={optimizeImageUrl(store.logo_url, 48, 48, 'contain')}
                alt={store.name}
                width={48}
                height={48}
                className="h-12 w-12 object-contain flex-shrink-0 rounded-lg"
              />
            ) : (
              <div
                className="h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${accentColor}20` }}
              >
                <StoreIcon className="h-5 w-5" style={{ color: accentColor }} />
              </div>
            )}

            {/* Name + badges + stats */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold text-foreground truncate">
                  {store.name}
                </h1>
                {store.is_verified && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <CheckCircle className="h-3 w-3" />
                    Verified
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  {store.product_count || 0} Products
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {store.follower_count || 0} Followers
                </span>
                {store.average_rating && (
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                    {store.average_rating.toFixed(1)}
                  </span>
                )}
                {(store.total_sales || 0) > 0 && (
                  <span>{store.total_sales} sales</span>
                )}
              </div>
            </div>

            {/* Actions — right-aligned on desktop */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <FollowButton storeId={store.id} accentColor={accentColor} size="sm" />
              <Button variant="outline" size="sm" asChild className="gap-1.5">
                <Link to={`/store/${store.slug || storeSlug || ''}/reviews`}>
                  <Star className="h-3.5 w-3.5" />
                  Reviews
                </Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => {
                  if (!user) {
                    navigate('/auth?redirect=' + encodeURIComponent(`/store/${storeSlug}`));
                    return;
                  }
                  navigate(`/store-messages?store=${store.id}`);
                }}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Message
              </Button>
            </div>
          </div>

          {/* Description */}
          {store.description && (
            <p className="text-sm text-muted-foreground max-w-2xl mb-2">
              {store.description}
            </p>
          )}

          {/* Bio — plain text, no quotes/italic */}
          {bio && (
            <div className="text-sm text-muted-foreground max-w-2xl mb-4">
              {bio.length > 150 && !bioExpanded ? (
                <>
                  {bio.slice(0, 150)}...
                  <button
                    onClick={() => setBioExpanded(true)}
                    className="ml-1 text-xs font-medium hover:underline"
                    style={{ color: accentColor }}
                  >
                    Read more
                  </button>
                </>
              ) : (
                <>
                  {bio}
                  {bio.length > 150 && (
                    <button
                      onClick={() => setBioExpanded(false)}
                      className="ml-1 text-xs font-medium hover:underline"
                      style={{ color: accentColor }}
                    >
                      Show less
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Selling since */}
          {store.created_at && (
            <p className="text-xs text-muted-foreground mb-4">
              Selling since {new Date(store.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>

        {/* Content sections */}
        {activeTab ? (
          <div className="container px-4 mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleTabClick(null)}
              className="text-muted-foreground hover:text-foreground mb-3 -ml-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Store
            </Button>

            <StoreProductGrid
              products={filteredProducts}
              isLoading={productsLoading || tabProductsLoading}
              storeId={store.id}
              accentColor={accentColor}
              eclipsePlusEnabled={store?.eclipse_plus_discount_enabled}
              title={storeTabs?.find(t => t.slug === activeTab)?.name || 'Products'}
              emptyTitle="No Products in This Category"
              emptyDescription="There are no products in this category yet."
              onBackToStore={() => handleTabClick(null)}
            />

            {/* Reviews after category products */}
            <section className="border-t border-border pt-6 mt-8 mb-8">
              <StoreReviews
                storeId={store.id}
                storeName={store.name}
                accentColor={accentColor}
                averageRating={store.average_rating}
              />
            </section>
          </div>
        ) : (
          <div className="container px-4 mt-2 space-y-6">
            {(() => {
              const storeLayout = (store as any)?.store_layout;
              const defaultOrder = [
                'best_sellers', 'products', 'trust_signals', 'custom_sections', 'reviews', 'recommendations'
              ];
              const layoutSections = storeLayout?.sections
                ? (storeLayout.sections as Array<{ type: string; visible: boolean; config?: Record<string, any> }>)
                    .filter(s => s.visible !== false)
                    .map(s => ({ type: s.type, config: (s.config || {}) as any }))
                : defaultOrder.map(type => ({ type, config: {} as any }));

              const contentSections = layoutSections.filter(
                s => s.type !== 'banner' && s.type !== 'header'
              );

              return contentSections.map((section, idx) => {
                switch (section.type) {
                  case 'announcement':
                    return section.config?.active && section.config?.text ? (
                      <div
                        key={`section-${section.type}-${idx}`}
                        className="rounded-lg px-4 py-2.5 text-center text-sm font-medium flex items-center justify-center gap-2"
                        style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
                      >
                        <Megaphone className="h-4 w-4 shrink-0" />
                        {section.config.text}
                      </div>
                    ) : null;

                  case 'best_sellers':
                    return (
                      <div key={`section-${section.type}-${idx}`}>
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
                      <StoreProductGrid
                        key={`section-${section.type}-${idx}`}
                        products={filteredProducts}
                        isLoading={productsLoading}
                        storeId={store.id}
                        accentColor={accentColor}
                        eclipsePlusEnabled={store?.eclipse_plus_discount_enabled}
                      />
                    );

                  case 'trust_signals':
                    return (
                      <section key={`section-${section.type}-${idx}`} className="border-t border-border pt-4">
                        <StoreTrustSignals accentColor={accentColor} isVerified={store.is_verified} />
                      </section>
                    );

                  case 'custom_sections':
                    return (
                      <div key={`section-${section.type}-${idx}`}>
                        <StoreCustomSections storeId={store.id} accentColor={accentColor} />
                      </div>
                    );

                  case 'reviews':
                    return (
                      <section key={`section-${section.type}-${idx}`} className="border-t border-border pt-6">
                        <StoreReviews
                          storeId={store.id}
                          storeName={store.name}
                          accentColor={accentColor}
                          averageRating={store.average_rating}
                        />
                      </section>
                    );

                  case 'recommendations':
                    return products && products.length > 0 ? (
                      <section key={`section-${section.type}-${idx}`} id="store-recommendations" className="border-t border-border pt-6 scroll-mt-20">
                        <StoreRecommendations
                          storeId={store.id}
                          storeName={store.name}
                          categoryIds={[...new Set(products.map(p => p.category_id).filter(Boolean))] as string[]}
                          accentColor={accentColor}
                          limit={4}
                        />
                      </section>
                    ) : null;

                  default:
                    return null;
                }
              });
            })()}
          </div>
        )}
      </StoreLayout>
    </>
  );
}
