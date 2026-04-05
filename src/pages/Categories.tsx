import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { motion } from 'framer-motion';
import { categoryIconMap, PackageIcon } from '@/components/icons/CategoryIcons';
import { MainLayout } from '@/components/layout/MainLayout';

import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageTracking } from '@/hooks/usePageTracking';
import { usePageMeta } from '@/hooks/usePageMeta';
import { BreadcrumbSchema } from '@/components/seo/StructuredData';
import { useCallback } from 'react';

const CUSTOM_BANNER_CATEGORIES = new Set(['bots']);

const CATEGORY_SORT_ORDER: Record<string, number> = {
  'bundle-deals': 0,
  'ambulance-vehicles': 1,
  'marked-police-vehicles': 2,
  'bots': 3,
  'unmarked-police-vehicles': 4,
  'civilian-vehicles': 5,
  'buildings': 6,
  'maps': 7,
  'military-vehicles': 8,
  'fire-vehicles': 9,
  'aircraft': 10,
  'uniforms': 11,
};

interface TopProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[] | null;
}

interface CategoryData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  product_count: number;
  topProducts: TopProduct[];
}

function useCategoriesWithProducts(sourceFilter: string | null) {
  const isMarketplace = sourceFilter === 'marketplace';
  return useQuery({
    queryKey: ['categories-grid', sourceFilter],
    queryFn: async () => {
      const now = new Date().toISOString();

      const { data: parents, error } = await supabase
        .from('categories')
        .select('id, name, slug, description, display_order')
        .is('parent_id', null)
        .order('display_order', { ascending: true });
      if (error) throw error;

      const { data: children } = await supabase
        .from('categories')
        .select('id, parent_id')
        .not('parent_id', 'is', null);

      const childMap: Record<string, string[]> = {};
      (children || []).forEach(c => {
        if (!childMap[c.parent_id!]) childMap[c.parent_id!] = [];
        childMap[c.parent_id!].push(c.id);
      });

      const results: CategoryData[] = await Promise.all(
        (parents || []).map(async (parent) => {
          const catIds = [parent.id, ...(childMap[parent.id] || [])];

          let countQ = supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .in('category_id', catIds)
            .eq('is_active', true)
            .eq('moderation_status', 'approved')
            .or(`release_at.is.null,release_at.lte.${now}`);
          if (isMarketplace) countQ = countQ.not('store_id', 'is', null);
          const { count } = await countQ;

          let topQ = supabase
            .from('products')
            .select('id, name, slug, product_number, price, images')
            .in('category_id', catIds)
            .eq('is_active', true)
            .eq('moderation_status', 'approved')
            .or(`release_at.is.null,release_at.lte.${now}`)
            .order('download_count', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false })
            .limit(4);
          if (isMarketplace) topQ = topQ.not('store_id', 'is', null);
          const { data: topProducts } = await topQ;

          return {
            id: parent.id,
            name: parent.name,
            slug: parent.slug,
            description: parent.description,
            product_count: count || 0,
            topProducts: (topProducts || []) as TopProduct[],
          };
        })
      );

      // Sort: non-empty categories first by sort order, then empty ones at the end
      results.sort((a, b) => {
        if (a.product_count > 0 && b.product_count === 0) return -1;
        if (a.product_count === 0 && b.product_count > 0) return 1;
        const orderA = CATEGORY_SORT_ORDER[a.slug] ?? 99;
        const orderB = CATEGORY_SORT_ORDER[b.slug] ?? 99;
        return orderA - orderB;
      });

      return results;
    },
    staleTime: 1000 * 60 * 3,
  });
}

function getProductThumb(product: TopProduct): string | null {
  if (!product.images?.length) return null;
  const img = product.images.find(u => !u.endsWith('.mp4') && !u.endsWith('.webm'));
  return img || null;
}

function CategoryCard({ category, sourceParam, index }: { category: CategoryData; sourceParam: string; index: number }) {
  const Icon = categoryIconMap[category.slug] || PackageIcon;
  const isCustomBanner = CUSTOM_BANNER_CATEGORIES.has(category.slug);
  const bgImage = isCustomBanner ? null : (category.topProducts.length > 0 ? getProductThumb(category.topProducts[0]) : null);
  const isEmpty = category.product_count === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Link
        to={isEmpty ? '#' : `/products?category=${category.slug}${sourceParam}`}
        className={`group relative flex flex-col overflow-hidden rounded-xl border transition-all duration-300 ${
          isEmpty
            ? 'border-border/30 opacity-40 cursor-default'
            : 'border-border/50 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 active:scale-[0.98]'
        }`}
      >
        {/* Hero Image Area — taller on mobile for better touch targets */}
        <div className="relative overflow-hidden h-40 sm:h-48 lg:h-56">
          {isCustomBanner && category.slug === 'bots' ? (
            <>
              <div className="absolute inset-0 bg-[#5865F2]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_60%)]" />
              <div className="absolute inset-0 flex items-center justify-center gap-3">
                <svg viewBox="0 0 127.14 96.36" className="h-12 w-12 sm:h-14 sm:w-14 text-white/90 fill-current drop-shadow-lg">
                  <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
                </svg>
              </div>
            </>
          ) : (
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-110"
              style={{
                backgroundImage: bgImage
                  ? `url(${bgImage})`
                  : 'linear-gradient(135deg, hsl(var(--muted)), hsl(var(--muted-foreground) / 0.1))',
              }}
            />
          )}

          {/* Cinematic gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-card/50 via-transparent to-transparent" />

          {/* Product count badge */}
          {!isEmpty && (
            <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-card/80 backdrop-blur-sm border border-border/50 text-[10px] sm:text-[11px] font-bold text-foreground tabular-nums">
              {category.product_count} {category.product_count === 1 ? 'product' : 'products'}
            </div>
          )}

          {/* Category info — min 44px touch target on icon */}
          <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 min-w-[2.5rem] rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center backdrop-blur-sm">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-base sm:text-lg font-bold text-foreground truncate tracking-tight leading-tight">
                  {category.name}
                </h3>
                {category.description && (
                  <p className="text-[11px] sm:text-xs text-muted-foreground truncate mt-0.5 leading-tight">
                    {category.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Product thumbnails — horizontal scroll on mobile, grid on desktop */}
        {category.topProducts.length > 0 && (
          <div className="relative bg-card/80 border-t border-border/30">
            <div className="px-3 py-2">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Popular</span>
                <div className="flex-1 h-px bg-border/40" />
                {!isEmpty && (
                  <span className="text-[10px] font-medium text-primary flex items-center gap-0.5 group-hover:gap-1.5 transition-all min-h-[44px] items-center">
                    Browse <ArrowRight className="h-3 w-3" />
                  </span>
                )}
              </div>
              {/* Horizontal scroll on mobile, grid on sm+ */}
              <div className="flex sm:grid sm:grid-cols-4 gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1 snap-x snap-mandatory sm:overflow-visible sm:mx-0 sm:px-0">
                {category.topProducts.map((product) => {
                  const thumb = getProductThumb(product);
                  return (
                    <div
                      key={product.id}
                      className="relative shrink-0 w-20 sm:w-auto snap-start rounded-md overflow-hidden border border-border/50 aspect-[4/3] group-hover:border-primary/30 transition-colors"
                    >
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted/50 flex items-center justify-center">
                          <PackageIcon className="h-3.5 w-3.5 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Fill empty slots on desktop only — only if at least 2 products */}
                {category.topProducts.length >= 2 && Array.from({ length: Math.max(0, 4 - category.topProducts.length) }).map((_, i) => (
                  <div key={`empty-${i}`} className="hidden sm:block rounded-md border border-border/30 aspect-[4/3] bg-muted/20" />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {category.topProducts.length === 0 && (
          <div className="px-4 py-4 text-center border-t border-border/30 bg-card/50">
            <p className="text-[10px] sm:text-xs text-muted-foreground/60 font-medium uppercase tracking-wider">Coming Soon</p>
          </div>
        )}
      </Link>
    </motion.div>
  );
}

function CategorySkeleton() {
  return (
    <div className="rounded-xl border border-border/30 bg-card overflow-hidden">
      <Skeleton className="h-40 sm:h-48 lg:h-56 rounded-none" />
      <div className="px-3 py-2 space-y-1.5 border-t border-border/30">
        <Skeleton className="h-2.5 w-16" />
        <div className="flex sm:grid sm:grid-cols-4 gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="shrink-0 w-20 sm:w-auto aspect-[4/3] rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Categories() {
  usePageMeta({ title: 'Categories', description: 'Browse Roblox asset categories on Eclipse — police vehicles, civilian cars, maps, scripts, bots and more.', canonicalPath: '/categories' });
  usePageTracking({ pagePath: '/categories' });
  const [searchParams] = useSearchParams();
  const sourceFilter = searchParams.get('source');
  const isMarketplace = sourceFilter === 'marketplace';
  const sourceParam = isMarketplace ? '&source=marketplace' : '';
  const queryClient = useQueryClient();

  const { data: categories, isLoading } = useCategoriesWithProducts(sourceFilter);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['categories-with-products'] });
  }, [queryClient]);

  return (
    <MainLayout>
      <BreadcrumbSchema items={[
        { name: 'Home', url: 'https://eclipserblx.com/' },
        { name: 'Categories', url: 'https://eclipserblx.com/categories' },
      ]} />
      
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <PageHeader
          title="Browse Categories"
          description="Explore our full catalogue of assets, scripts, vehicles, and more."
        />

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {Array.from({ length: 9 }).map((_, i) => <CategorySkeleton key={i} />)}
          </div>
        ) : (() => {
          const active = categories?.filter(c => c.product_count > 0) || [];
          const empty = categories?.filter(c => c.product_count === 0) || [];
          return (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {active.map((category, index) => (
                  <CategoryCard key={category.id} category={category} sourceParam={sourceParam} index={index} />
                ))}
              </div>
              {empty.length > 0 && (
                <>
                  <div className="flex items-center gap-3 mt-8 mb-4">
                    <div className="h-px flex-1 bg-border/40" />
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Coming Soon</span>
                    <div className="h-px flex-1 bg-border/40" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {empty.map((category, index) => (
                      <CategoryCard key={category.id} category={category} sourceParam={sourceParam} index={active.length + index} />
                    ))}
                  </div>
                </>
              )}
            </>
          );
        })()}
      </div>
      </PullToRefresh>
    </MainLayout>
  );
}
