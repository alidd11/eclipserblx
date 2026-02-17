import { Link } from 'react-router-dom';
import { Car, Code, Bot, Layout, Box, Palette, Wrench, Gamepad2, Package, Map, Shirt, Plane, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCategoryTranslations } from '@/hooks/useCategoryTranslations';
import { Skeleton } from '@/components/ui/skeleton';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

const iconMap: Record<string, typeof Car> = {
  'Car': Car,
  'FileCode': Code,
  'Bot': Bot,
  'Layout': Layout,
  'Box': Box,
  'Palette': Palette,
  'Wrench': Wrench,
  'Gamepad2': Gamepad2,
  'Package': Package,
  'Map': Map,
  'Shirt': Shirt,
  'Plane': Plane,
  'Sparkles': Palette,
};

// Eclipse & Vino store IDs for fallback imagery
const FALLBACK_STORE_IDS = [
  '83b5dde6-ce72-4f1b-a9f9-ff1eb5cbc23a', // Eclipse
  '9b842052-e1fd-4dfe-99bf-c7625df3e17d', // Vino
];

interface CategoryWithProducts {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  parent_id: string | null;
  display_order: number | null;
  product_count: number;
  hero_image: string | null;
}

export function CategoriesGrid() {
  const { getTranslatedName } = useCategoryTranslations();

  const { data: categories, isLoading } = useQuery({
    queryKey: ['marketplace-categories-grid-v2'],
    queryFn: async () => {
      const { data: cats, error: catError } = await supabase
        .from('categories')
        .select('id, name, slug, description, icon, parent_id, display_order')
        .is('parent_id', null)
        .order('display_order', { ascending: true });

      if (catError) throw catError;
      if (!cats?.length) return [];

      const catIds = cats.map(c => c.id);
      const now = new Date().toISOString();

      // Fetch active products with download_count for ranking
      const { data: products, error: prodError } = await supabase
        .from('products')
        .select('category_id, images, download_count, store_id')
        .in('category_id', catIds)
        .eq('is_active', true)
        .not('store_id', 'is', null)
        .or(`release_at.is.null,release_at.lte.${now}`)
        .order('download_count', { ascending: false });

      if (prodError) throw prodError;

      // Pick the best image per category: highest download_count with a valid image
      const bestPerCat: Record<string, { image: string; count: number }> = {};
      const countPerCat: Record<string, number> = {};

      for (const p of products || []) {
        countPerCat[p.category_id] = (countPerCat[p.category_id] || 0) + 1;
        if (!bestPerCat[p.category_id] && Array.isArray(p.images) && p.images[0]) {
          bestPerCat[p.category_id] = {
            image: p.images[0] as string,
            count: p.download_count ?? 0,
          };
        }
      }

      // Fallback: fetch a product from Eclipse/Vino for categories with no image
      const catsNeedingFallback = catIds.filter(id => !bestPerCat[id]);
      let fallbackImage: string | null = null;

      if (catsNeedingFallback.length > 0) {
        const { data: fallbackProducts } = await supabase
          .from('products')
          .select('images')
          .in('store_id', FALLBACK_STORE_IDS)
          .eq('is_active', true)
          .not('images', 'is', null)
          .order('download_count', { ascending: false })
          .limit(1);

        if (fallbackProducts?.[0]?.images && Array.isArray(fallbackProducts[0].images)) {
          fallbackImage = fallbackProducts[0].images[0] as string;
        }
      }

      const result: CategoryWithProducts[] = cats.map(c => ({
        ...c,
        product_count: countPerCat[c.id] || 0,
        hero_image: bestPerCat[c.id]?.image || fallbackImage,
      }));

      result.sort((a, b) => {
        if (a.product_count > 0 && b.product_count === 0) return -1;
        if (a.product_count === 0 && b.product_count > 0) return 1;
        if (a.product_count > 0 && b.product_count > 0) return b.product_count - a.product_count;
        return (a.display_order ?? 99) - (b.display_order ?? 99);
      });

      return result;
    },
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] rounded-[0.375rem]" />
          ))}
        </div>
      </div>
    );
  }

  if (!categories?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No categories available yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Browse by Category</h2>
        <Link to="/categories" className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-0.5">
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {categories.map((category) => {
          const IconComponent = iconMap[category.icon || ''] || Package;
          const isEmpty = category.product_count === 0;

          return (
            <Link
              key={category.id}
              to={`/products?category=${category.slug}`}
              className={`group relative flex flex-col overflow-hidden rounded-[0.375rem] border bg-card transition-all ${
                isEmpty
                  ? 'border-border/50 opacity-70 hover:opacity-100 hover:border-border'
                  : 'border-border hover:border-primary/30'
              }`}
            >
              <div className={`relative aspect-[16/10] overflow-hidden flex items-center justify-center ${isEmpty ? 'bg-muted/40' : 'bg-muted'}`}>
                {!isEmpty && category.hero_image ? (
                  <OptimizedImage
                    src={category.hero_image}
                    alt={category.name}
                    className="h-full w-full group-hover:scale-105 transition-transform duration-300"
                    objectFit="cover"
                    blur={false}
                  />
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40">Coming Soon</span>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent opacity-70 group-hover:opacity-60 transition-opacity" />
                {!isEmpty && (
                  <div className="absolute top-1.5 right-1.5 bg-card/80 text-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded-[0.25rem] border border-border">
                    {category.product_count}
                  </div>
                )}
              </div>

              <div className="px-2 py-1.5 bg-muted/60">
                <span className={`font-semibold text-[9px] sm:text-[11px] leading-tight transition-colors block truncate uppercase tracking-wide ${isEmpty ? 'text-muted-foreground group-hover:text-foreground' : 'text-foreground group-hover:text-primary'}`}>
                  {getTranslatedName(category.id, category.name)}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
