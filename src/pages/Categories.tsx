import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Car, Shield, ShieldOff, Flame, Ambulance, Plane, Shirt, Swords,
  Map, Package, Bot, Building2, ChevronRight, ArrowRight
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageTracking } from '@/hooks/usePageTracking';

// Categories that get a custom styled banner instead of product images
const CUSTOM_BANNER_CATEGORIES = new Set(['bots']);

const categoryIcons: Record<string, React.ElementType> = {
  'civilian-vehicles': Car,
  'marked-police-vehicles': Shield,
  'unmarked-police-vehicles': ShieldOff,
  'fire-vehicles': Flame,
  'ambulance-vehicles': Ambulance,
  'aircraft': Plane,
  'uniforms': Shirt,
  'military-vehicles': Swords,
  'maps': Map,
  'bundle-deals': Package,
  'bots': Bot,
  'buildings': Building2,
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

      // Fetch parent categories
      const { data: parents, error } = await supabase
        .from('categories')
        .select('id, name, slug, description, display_order')
        .is('parent_id', null)
        .order('display_order', { ascending: true });
      if (error) throw error;

      // Also fetch children to aggregate counts
      const { data: children } = await supabase
        .from('categories')
        .select('id, parent_id')
        .not('parent_id', 'is', null);

      const childMap: Record<string, string[]> = {};
      (children || []).forEach(c => {
        if (!childMap[c.parent_id!]) childMap[c.parent_id!] = [];
        childMap[c.parent_id!].push(c.id);
      });

      // For each parent, get count + top 4 products across parent + child categories
      const results: CategoryData[] = await Promise.all(
        (parents || []).map(async (parent) => {
          const catIds = [parent.id, ...(childMap[parent.id] || [])];

          // Count
          let countQ = supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .in('category_id', catIds)
            .eq('is_active', true)
            .eq('moderation_status', 'approved')
            .or(`release_at.is.null,release_at.lte.${now}`);
          if (isMarketplace) countQ = countQ.not('store_id', 'is', null);
          const { count } = await countQ;

          // Top products (by downloads, newest as tiebreaker)
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

      return results;
    },
    staleTime: 1000 * 60 * 3,
  });
}

// Get first image URL from a product, filtering out videos
function getProductThumb(product: TopProduct): string | null {
  if (!product.images?.length) return null;
  const img = product.images.find(u => !u.endsWith('.mp4') && !u.endsWith('.webm'));
  return img || null;
}

function CategoryCard({ category, sourceParam }: { category: CategoryData; sourceParam: string }) {
  const Icon = categoryIcons[category.slug] || Package;
  const isCustomBanner = CUSTOM_BANNER_CATEGORIES.has(category.slug);
  const bgImage = isCustomBanner
    ? null
    : (category.topProducts.length > 0 ? getProductThumb(category.topProducts[0]) : null);
  const isEmpty = category.product_count === 0;

  return (
    <div className={`group rounded-lg border border-border bg-card overflow-hidden transition-all duration-200 hover:border-primary/40 hover:-translate-y-0.5 ${isEmpty ? 'opacity-50' : ''}`}>
      {/* Category header with image */}
      <Link
        to={isEmpty ? '#' : `/products?category=${category.slug}${sourceParam}`}
        className="relative block h-32 sm:h-36 overflow-hidden"
      >
        {isCustomBanner && category.slug === 'bots' ? (
          <>
            {/* Discord-branded banner for bots */}
            <div className="absolute inset-0 bg-[#5865F2]" />
            <div className="absolute inset-0 flex items-center justify-center gap-3">
              <svg viewBox="0 0 127.14 96.36" className="h-12 w-12 sm:h-14 sm:w-14 text-white fill-current">
                <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
              </svg>
              <span className="text-white font-extrabold text-xl sm:text-2xl tracking-wide uppercase">Discord Bots</span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          </>
        ) : (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
              style={{
                backgroundImage: bgImage
                  ? `url(${bgImage})`
                  : 'linear-gradient(135deg, hsl(var(--muted)), hsl(var(--muted-foreground) / 0.15))'
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          </>
        )}
        
        {/* Category info overlay */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-card/90 border border-border/50 flex items-center justify-center shrink-0">
              <Icon className="h-4.5 w-4.5 text-foreground" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-white truncate">{category.name}</h3>
              <span className="text-[11px] text-white/60">{category.product_count} products</span>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-white/50 shrink-0 group-hover:text-white/80 transition-colors" />
        </div>
      </Link>

      {/* Top products row */}
      {category.topProducts.length > 0 && (
        <div className="px-3 py-2.5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Top Products</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {category.topProducts.map((product) => {
              const thumb = getProductThumb(product);
              return (
                <Link
                  key={product.id}
                  to={`/product/${product.slug}`}
                  className="group/item relative rounded-md overflow-hidden border border-border aspect-square hover:border-primary/40 transition-colors"
                  title={product.name}
                >
                  {thumb ? (
                    <img 
                      src={thumb} 
                      alt={product.name} 
                      className="w-full h-full object-cover transition-transform duration-300 group-hover/item:scale-110"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Package className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity" />
                </Link>
              );
            })}
            {/* Fill empty slots */}
            {Array.from({ length: Math.max(0, 4 - category.topProducts.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="rounded-md border border-border/50 aspect-square bg-muted/30" />
            ))}
          </div>
          {!isEmpty && (
            <Link
              to={`/products?category=${category.slug}${sourceParam}`}
              className="flex items-center justify-center gap-1 mt-2.5 text-[11px] text-muted-foreground hover:text-primary transition-colors"
            >
              Browse all <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      )}

      {/* Fallback for categories with no products */}
      {category.topProducts.length === 0 && (
        <div className="px-3 py-4 text-center">
          <p className="text-xs text-muted-foreground">No products yet</p>
        </div>
      )}
    </div>
  );
}

function CategorySkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <Skeleton className="h-32 sm:h-36 rounded-none" />
      <div className="px-3 py-2.5 space-y-2">
        <Skeleton className="h-3 w-20" />
        <div className="grid grid-cols-4 gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Categories() {
  usePageTracking({ pagePath: '/categories' });
  const [searchParams] = useSearchParams();
  const sourceFilter = searchParams.get('source');
  const isMarketplace = sourceFilter === 'marketplace';
  const sourceParam = isMarketplace ? '&source=marketplace' : '';

  const { data: categories, isLoading } = useCategoriesWithProducts(sourceFilter);

  return (
    <MainLayout>
      <div className="container py-6 sm:py-8 max-w-5xl">
        <div className="mb-6 sm:mb-8">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Categories
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse products by category
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => <CategorySkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories?.map((category) => (
              <CategoryCard key={category.id} category={category} sourceParam={sourceParam} />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
