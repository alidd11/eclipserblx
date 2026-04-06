import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFeaturedProducts } from '@/hooks/useFeaturedProducts';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProductCard } from '@/components/ui/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { BackgroundVideo } from '@/components/ui/BackgroundVideo';
import { ArrowRight, Play, ShoppingBag, Download } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useCurrency } from '@/hooks/useCurrency';
import { getFirstMediaPrioritizeVideo, isVideoUrl } from '@/lib/mediaUtils';
import { usePageTracking } from '@/hooks/usePageTracking';
import { usePageMeta } from '@/hooks/usePageMeta';

export default function Featured() {
  usePageTracking({ pagePath: '/featured' });
  usePageMeta({ title: 'Featured Products', description: 'Discover featured and trending Roblox assets on Eclipse. Hand-picked premium scripts, vehicles, maps and more.', canonicalPath: '/featured' });
  const { getMemberPrice, getDiscountPercent, isEligibleForDiscount } = useSubscription();
  const { formatPrice } = useCurrency();

  const { data: featuredProducts, isLoading: loadingFeatured } = useFeaturedProducts({
    limit: 12,
    maxPerStore: 3,
    queryKey: 'featured-page-scored',
  });

  const { data: newProducts, isLoading: loadingNew } = useQuery({
    queryKey: ['featured-page-new'],
    queryFn: async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { data, error } = await supabase
        .from('products')
        .select(`*, categories (name, slug), stores (name, slug, is_active, logo_url, is_verified, eclipse_plus_discount_enabled)`)
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

  const { data: popularProducts, isLoading: loadingPopular } = useQuery({
    queryKey: ['featured-page-popular'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`*, categories (name, slug), stores (name, slug, is_active, logo_url, is_verified, eclipse_plus_discount_enabled)`)
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
        {/* Hero — compact editorial banner */}
        <section className="py-6 md:py-10">
          <div className="container mx-auto px-4">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">Staff Picks</p>
              <h1 className="font-display text-2xl md:text-3xl font-bold">Hand-Selected by Eclipse</h1>
              <p className="text-sm text-muted-foreground mt-1">Curated weekly by our editorial team</p>
            </div>

            {loadingFeatured ? (
              <Skeleton className="w-full aspect-[2.5/1] rounded-xl" />
            ) : heroProduct ? (
              <HeroProductCard product={heroProduct} />
            ) : null}
          </div>
        </section>

        {/* Featured Collection — numbered picks */}
        {curatedProducts.length > 0 && (
          <section className="py-8 md:py-12">
            <div className="container mx-auto px-4">
              <SectionHeader title="Featured Collection" subtitle="More hand-picked favorites" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
                {curatedProducts.map((product, idx) => (
                  <div key={product.id} className="relative">
                    <div className="absolute top-2 left-2 z-10 w-6 h-6 rounded-md bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-sm">
                      #{idx + 1}
                    </div>
                    <ProductCard
                      id={product.id}
                      name={product.name}
                      slug={String((product as any).product_number)}
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
                      isResellable={product.is_resellable}
                      storeEclipseEnabled={product.stores?.eclipse_plus_discount_enabled}
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* New This Week */}
        <section className="py-8 md:py-12">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <SectionHeader title="New This Week" subtitle="Fresh additions to the store" />
              <Link to="/products?sort=newest" className="hidden sm:block">
                <Button variant="outline" size="sm" className="text-xs">
                  View All <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>

            {loadingNew ? (
              <SkeletonGrid count={4} />
            ) : newProducts && newProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
                {newProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    name={product.name}
                    slug={String((product as any).product_number)}
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
                    isResellable={product.is_resellable}
                    storeEclipseEnabled={product.stores?.eclipse_plus_discount_enabled}
                  />
                ))}
              </div>
            ) : (
              <p className="text-center py-10 text-sm text-muted-foreground">No new products this week. Check back soon!</p>
            )}

            <div className="mt-5 text-center sm:hidden">
              <Link to="/products?sort=newest">
                <Button variant="outline" size="sm" className="text-xs">
                  View All New <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Popular Picks — with download counts */}
        <section className="py-8 md:py-12">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <SectionHeader title="Popular Picks" subtitle="Community favorites by downloads" />
              <Link to="/products?sort=popularity" className="hidden sm:block">
                <Button variant="outline" size="sm" className="text-xs">
                  View All <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>

            {loadingPopular ? (
              <SkeletonGrid count={4} />
            ) : popularProducts && popularProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
                {popularProducts.map((product) => (
                  <div key={product.id} className="relative">
                    {(product as any).download_count > 0 && (
                      <div className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background/80 backdrop-blur-sm border border-border text-[10px] font-medium text-muted-foreground">
                        <Download className="h-2.5 w-2.5" />
                        {formatDownloads((product as any).download_count)}
                      </div>
                    )}
                    <ProductCard
                      id={product.id}
                      name={product.name}
                      slug={String((product as any).product_number)}
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
                      isResellable={product.is_resellable}
                      storeEclipseEnabled={product.stores?.eclipse_plus_discount_enabled}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-10 text-sm text-muted-foreground">No popular products yet. Check back soon!</p>
            )}

            <div className="mt-5 text-center sm:hidden">
              <Link to="/products?sort=popularity">
                <Button variant="outline" size="sm" className="text-xs">
                  View All Popular <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}

/* ── Helpers ── */

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">{title}</h2>
      <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
    </div>
  );
}

function SkeletonGrid({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
          <Skeleton className="aspect-square" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-5 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

function formatDownloads(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(count);
}

function HeroProductCard({ product }: { product: any }) {
  const { getMemberPrice, getDiscountPercent, isEligibleForDiscount } = useSubscription();
  const { formatPrice } = useCurrency();
  const displayMedia = getFirstMediaPrioritizeVideo(product.images);
  const isVideo = isVideoUrl(displayMedia);

  const storeEclipseEnabled = product.stores?.eclipse_plus_discount_enabled;
  const isEligible = isEligibleForDiscount(product.category_id, product.is_resellable, storeEclipseEnabled);
  const memberPrice = isEligible ? getMemberPrice(product.price, product.category_id, product.is_resellable) : product.price;
  const discount = isEligible ? getDiscountPercent(product.category_id, product.is_resellable) : 0;

  return (
    <Link
      to={`/products/${(product as any).product_number}`}
      className="block group"
    >
      <div className="relative rounded-xl overflow-hidden border border-border bg-card">
        <div className="relative aspect-[16/9] md:aspect-[2.5/1] overflow-hidden">
          {displayMedia ? (
            isVideo ? (
              <>
                <BackgroundVideo
                  src={displayMedia}
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-background/60 backdrop-blur-sm flex items-center justify-center">
                    <Play className="h-4 w-4 text-foreground ml-0.5" fill="currentColor" />
                  </div>
                </div>
              </>
            ) : (
              <img
                src={displayMedia}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                loading="eager"
              />
            )
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <ShoppingBag className="h-12 w-12 text-muted-foreground" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

          {/* Staff Pick badge */}
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider">
              Staff Pick
            </span>
          </div>
        </div>

        {/* Overlay content */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-white/60 font-medium uppercase tracking-wider mb-1">
                {product.categories?.name || 'Featured'}
              </p>
              <h2 className="font-display text-lg md:text-2xl font-bold text-white truncate group-hover:text-primary transition-colors">
                {product.name}
              </h2>
              {product.stores?.name && (
                <p className="text-xs text-white/60 mt-0.5">by {product.stores.name}</p>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                {isEligible && (
                  <p className="text-xs text-white/40 line-through">{formatPrice(Number(product.price))}</p>
                )}
                <p className="text-xl md:text-2xl font-bold text-white">
                  {isEligible ? formatPrice(memberPrice) : formatPrice(Number(product.price))}
                </p>
                {isEligible && (
                  <p className="text-[10px] text-primary font-medium">Save {discount}%</p>
                )}
              </div>
              <Button
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex text-xs"
              >
                View <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
