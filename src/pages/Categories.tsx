import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { categoryIconMap, PackageIcon } from '@/components/icons/CategoryIcons';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageTracking } from '@/hooks/usePageTracking';
import { usePageMeta } from '@/hooks/usePageMeta';

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
            .select('id, name, slug, price, images')
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

      results.sort((a, b) => {
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
  const isFeatured = index < 2 && !isEmpty;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={isFeatured ? 'sm:col-span-2 lg:col-span-1' : ''}
    >
      <Link
        to={isEmpty ? '#' : `/products?category=${category.slug}${sourceParam}`}
        className={`group relative flex flex-col overflow-hidden rounded-xl border transition-all duration-300 ${
          isEmpty
            ? 'border-border/30 opacity-40 cursor-default'
            : 'border-border/50 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5'
        }`}
      >
        {/* Hero Image Area */}
        <div className={`relative overflow-hidden ${isFeatured ? 'h-56 sm:h-64' : 'h-44 sm:h-52'}`}>
          {isCustomBanner && category.slug === 'bots' ? (
            <>
              <div className="absolute inset-0 bg-[#5865F2]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_60%)]" />
              <div className="absolute inset-0 flex items-center justify-center gap-3">
                <svg viewBox="0 0 127.14 96.36" className="h-14 w-14 sm:h-16 sm:w-16 text-white/90 fill-current drop-shadow-lg">
                  <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
                </svg>
              </div>
            </>
          ) : (
            <>
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-110"
                style={{
                  backgroundImage: bgImage
                    ? `url(${bgImage})`
                    : 'linear-gradient(135deg, hsl(var(--muted)), hsl(var(--muted-foreground) / 0.1))',
                }}
              />
            </>
          )}

          {/* Cinematic gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-card/60 via-transparent to-transparent" />

          {/* Product count badge */}
          {!isEmpty && (
            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-card/80 backdrop-blur-sm border border-border/50 text-[11px] font-bold text-foreground tabular-nums">
              {category.product_count} products
            </div>
          )}

          {/* Category info - bottom left */}
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
            <div className="flex items-center gap-3 mb-1.5">
              <div className="w-10 h-10 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center backdrop-blur-sm">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-lg sm:text-xl font-bold text-foreground truncate tracking-tight">
                  {category.name}
                </h3>
                {category.description && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {category.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Product thumbnails strip — revealed on hover */}
        {category.topProducts.length > 0 && (
          <div className="relative bg-card/80 border-t border-border/30">
            <div className="px-3 py-2.5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Popular</span>
                <div className="flex-1 h-px bg-border/40" />
                {!isEmpty && (
                  <span className="text-[10px] font-medium text-primary flex items-center gap-0.5 group-hover:gap-1.5 transition-all">
                    Browse <ArrowRight className="h-3 w-3" />
                  </span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {category.topProducts.map((product) => {
                  const thumb = getProductThumb(product);
                  return (
                    <div
                      key={product.id}
                      className="relative rounded-md overflow-hidden border border-border/50 aspect-[4/3] group-hover:border-primary/30 transition-colors"
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
                {Array.from({ length: Math.max(0, 4 - category.topProducts.length) }).map((_, i) => (
                  <div key={`empty-${i}`} className="rounded-md border border-border/30 aspect-[4/3] bg-muted/20" />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {category.topProducts.length === 0 && (
          <div className="px-4 py-5 text-center border-t border-border/30 bg-card/50">
            <p className="text-xs text-muted-foreground/60 font-medium uppercase tracking-wider">Coming Soon</p>
          </div>
        )}
      </Link>
    </motion.div>
  );
}

function CategorySkeleton({ featured }: { featured?: boolean }) {
  return (
    <div className={`rounded-xl border border-border/30 bg-card overflow-hidden ${featured ? 'sm:col-span-2 lg:col-span-1' : ''}`}>
      <Skeleton className={`${featured ? 'h-56 sm:h-64' : 'h-44 sm:h-52'} rounded-none`} />
      <div className="px-3 py-2.5 space-y-2 border-t border-border/30">
        <Skeleton className="h-2.5 w-16" />
        <div className="grid grid-cols-4 gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] rounded-md" />
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

  const { data: categories, isLoading } = useCategoriesWithProducts(sourceFilter);

  return (
    <MainLayout>
      <div className="container py-6 sm:py-10 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 sm:mb-10"
        >
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            Browse Categories
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2 max-w-lg">
            Explore our full catalogue of assets, scripts, vehicles, and more for your Roblox projects.
          </p>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {Array.from({ length: 9 }).map((_, i) => <CategorySkeleton key={i} featured={i < 2} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {categories?.map((category, index) => (
              <CategoryCard key={category.id} category={category} sourceParam={sourceParam} index={index} />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
