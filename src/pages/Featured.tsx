import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFeaturedProducts } from '@/hooks/useFeaturedProducts';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProductCard } from '@/components/ui/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { BackgroundVideo } from '@/components/ui/BackgroundVideo';
import { Sparkles, TrendingUp, Clock, ArrowRight, Play, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/hooks/useSubscription';
import { useCurrency } from '@/hooks/useCurrency';
import { getFirstMediaPrioritizeVideo, isVideoUrl } from '@/lib/mediaUtils';
import { formatDistanceToNow } from 'date-fns';
import { usePageTracking } from '@/hooks/usePageTracking';

export default function Featured() {
  usePageTracking({ pagePath: '/featured' });
  const { getMemberPrice, getDiscountPercent, isEligibleForDiscount } = useSubscription();
  const { formatPrice } = useCurrency();

  const { data: featuredProducts, isLoading: loadingFeatured } = useFeaturedProducts({
    limit: 12,
    maxPerStore: 3,
    queryKey: 'featured-page-scored',
  });

  // New this week - products added in last 7 days
  const { data: newProducts, isLoading: loadingNew } = useQuery({
    queryKey: ['featured-page-new'],
    queryFn: async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { data, error } = await supabase
        .from('products')
        .select(`*, categories (name, slug), stores (name, slug, is_active, logo_url, is_verified, is_trusted, eclipse_plus_discount_enabled)`)
        .eq('is_active', true)
        .or(`release_at.is.null,release_at.lte.${new Date().toISOString()}`)
        .gte('created_at', weekAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(8);
      
      if (error) throw error;
      return data?.filter(p => !p.stores || p.stores.is_active !== false) ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Popular picks - sorted by download count
  const { data: popularProducts, isLoading: loadingPopular } = useQuery({
    queryKey: ['featured-page-popular'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`*, categories (name, slug), stores (name, slug, is_active, logo_url, is_verified, is_trusted, eclipse_plus_discount_enabled)`)
        .eq('is_active', true)
        .or(`release_at.is.null,release_at.lte.${new Date().toISOString()}`)
        .order('download_count', { ascending: false })
        .limit(8);
      
      if (error) throw error;
      return data?.filter(p => !p.stores || p.stores.is_active !== false) ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const heroProduct = featuredProducts?.[0];
  const curatedProducts = featuredProducts?.slice(1, 5) ?? [];

  return (
    <MainLayout>
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="relative py-12 md:py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-transparent to-transparent" />
          <div className="container mx-auto px-4 relative">
            <div className="text-center mb-10 md:mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border mb-4">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Staff Picks</span>
              </div>
              <h1 className="font-display text-3xl md:text-5xl font-bold mb-4">
                Hand-Selected by Eclipse
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Our team personally curates the best assets, tools, and resources. 
                Updated weekly with fresh discoveries.
              </p>
            </div>

            {/* Hero Featured Product */}
            {loadingFeatured ? (
              <div className="max-w-4xl mx-auto">
                <Skeleton className="w-full aspect-[16/9] rounded-2xl" />
              </div>
            ) : heroProduct ? (
              <HeroProductCard product={heroProduct} />
            ) : null}
          </div>
        </section>

        {/* Curated Collection */}
        {curatedProducts.length > 0 && (
          <section className="py-12 md:py-16">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display text-2xl font-bold">Featured Collection</h2>
                    <p className="text-sm text-muted-foreground">More hand-picked favorites</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {curatedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    name={product.name}
                    slug={product.slug}
                    price={Number(product.price)}
                    image={product.images?.[0]}
                    images={product.images}
                    category={product.categories?.name}
                    categorySlug={product.categories?.slug}
                    categoryId={product.category_id}
                    isFeatured={product.is_featured}
                    createdAt={product.created_at}
                    storeName={product.stores?.name}
                    storeSlug={product.stores?.slug}
                    storeLogo={product.stores?.logo_url}
                    isVerified={product.stores?.is_verified}
                    isTrusted={product.stores?.is_trusted}
                    isResellable={product.is_resellable}
                    storeEclipseEnabled={product.stores?.eclipse_plus_discount_enabled}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* New This Week */}
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-bold">New This Week</h2>
                  <p className="text-sm text-muted-foreground">Fresh additions to the store</p>
                </div>
              </div>
              <Link to="/products?sort=newest" className="hidden sm:block">
                <Button variant="outline" size="sm">
                  View All New
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            
            {loadingNew ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                    <Skeleton className="aspect-[4/3]" />
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-5 w-full" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : newProducts && newProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {newProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    name={product.name}
                    slug={product.slug}
                    price={Number(product.price)}
                    image={product.images?.[0]}
                    images={product.images}
                    category={product.categories?.name}
                    categorySlug={product.categories?.slug}
                    categoryId={product.category_id}
                    isFeatured={product.is_featured}
                    createdAt={product.created_at}
                    storeName={product.stores?.name}
                    storeSlug={product.stores?.slug}
                    storeLogo={product.stores?.logo_url}
                    isVerified={product.stores?.is_verified}
                    isTrusted={product.stores?.is_trusted}
                    isResellable={product.is_resellable}
                    storeEclipseEnabled={product.stores?.eclipse_plus_discount_enabled}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No new products this week. Check back soon!</p>
              </div>
            )}
            
            <div className="mt-6 text-center sm:hidden">
              <Link to="/products?sort=newest">
                <Button variant="outline" size="sm">
                  View All New
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Popular Picks */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-bold">Popular Picks</h2>
                  <p className="text-sm text-muted-foreground">Community favorites by downloads</p>
                </div>
              </div>
              <Link to="/products?sort=popularity" className="hidden sm:block">
                <Button variant="outline" size="sm">
                  View All Popular
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            
            {loadingPopular ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                    <Skeleton className="aspect-[4/3]" />
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-5 w-full" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : popularProducts && popularProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {popularProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    name={product.name}
                    slug={product.slug}
                    price={Number(product.price)}
                    image={product.images?.[0]}
                    images={product.images}
                    category={product.categories?.name}
                    categorySlug={product.categories?.slug}
                    categoryId={product.category_id}
                    isFeatured={product.is_featured}
                    createdAt={product.created_at}
                    storeName={product.stores?.name}
                    storeSlug={product.stores?.slug}
                    storeLogo={product.stores?.logo_url}
                    isVerified={product.stores?.is_verified}
                    isTrusted={product.stores?.is_trusted}
                    isResellable={product.is_resellable}
                    storeEclipseEnabled={product.stores?.eclipse_plus_discount_enabled}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No popular products yet. Check back soon!</p>
              </div>
            )}
            
            <div className="mt-6 text-center sm:hidden">
              <Link to="/products?sort=popularity">
                <Button variant="outline" size="sm">
                  View All Popular
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 md:py-16 bg-gradient-to-b from-transparent to-muted/30">
          <div className="container mx-auto px-4 text-center">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">
              Looking for something specific?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Browse our complete catalog with advanced filtering, search, and sorting options.
            </p>
            <Link to="/products">
              <Button size="lg" className="gradient-button border-0">
                Browse All Products
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}

// Hero Product Card Component
function HeroProductCard({ product }: { product: any }) {
  const { getMemberPrice, getDiscountPercent, isEligibleForDiscount } = useSubscription();
  const { formatPrice } = useCurrency();
  const displayMedia = getFirstMediaPrioritizeVideo(product.images);
  const isVideo = isVideoUrl(displayMedia);
  
  // Pass is_resellable to properly exclude resell items from Eclipse+ pricing
  const storeEclipseEnabled = product.stores?.eclipse_plus_discount_enabled;
  const isEligible = isEligibleForDiscount(product.category_id, product.is_resellable, storeEclipseEnabled);
  const memberPrice = isEligible ? getMemberPrice(product.price, product.category_id, product.is_resellable) : product.price;
  const discount = isEligible ? getDiscountPercent(product.category_id, product.is_resellable) : 0;

  return (
    <Link 
      to={`/products/${product.slug}`}
      className="block max-w-4xl mx-auto group"
    >
      <div className="relative rounded-2xl overflow-hidden border border-border bg-card shadow-xl">
        {/* Media */}
        <div className="relative aspect-[16/9] md:aspect-[21/9] overflow-hidden">
          {displayMedia ? (
            isVideo ? (
              <>
                <BackgroundVideo
                  src={displayMedia}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                    <Play className="h-5 w-5 text-white ml-0.5" fill="white" />
                  </div>
                </div>
              </>
            ) : (
              <img
                src={displayMedia}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            )
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <ShoppingBag className="h-16 w-16 text-muted-foreground" />
            </div>
          )}
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          {/* Featured badge */}
          <div className="absolute top-4 left-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500 text-black text-xs font-bold">
              <Sparkles className="h-3 w-3" />
              STAFF PICK
            </div>
          </div>
        </div>
        
        {/* Content overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="flex-1">
              <p className="text-xs text-white/70 font-medium uppercase tracking-wider mb-2">
                {product.categories?.name || 'Featured'}
              </p>
              <h2 className="font-display text-xl md:text-3xl font-bold text-white mb-2 group-hover:text-primary transition-colors">
                {product.name}
              </h2>
              {product.stores?.name && (
                <p className="text-sm text-white/70">
                  by {product.stores.name}
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                {isEligible && (
                  <p className="text-sm text-white/50 line-through">
                    {formatPrice(Number(product.price))}
                  </p>
                )}
                <p className="text-2xl md:text-3xl font-bold text-white">
                  {isEligible ? formatPrice(memberPrice) : formatPrice(Number(product.price))}
                </p>
                {isEligible && (
                  <p className="text-xs text-amber-400 font-medium">
                    Save {discount}% with Eclipse+
                  </p>
                )}
              </div>
              <Button 
                size="lg" 
                className="gradient-button border-0 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
              >
                View Details
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
