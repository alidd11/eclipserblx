import { Link } from 'react-router-dom';
import { Car, Code, Bot, Layout, Box, Palette, Wrench, Gamepad2, Package, Map, Shirt, Plane, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCategoryTranslations } from '@/hooks/useCategoryTranslations';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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

interface CategoryWithProducts {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  parent_id: string | null;
  display_order: number | null;
  product_count: number;
  preview_images: string[];
}

export function CategoriesGrid() {
  const { getTranslatedName } = useCategoryTranslations();

  const { data: categories, isLoading } = useQuery({
    queryKey: ['marketplace-categories-grid-optimized'],
    queryFn: async () => {
      // 1. Fetch parent categories
      const { data: cats, error: catError } = await supabase
        .from('categories')
        .select('id, name, slug, description, icon, parent_id, display_order')
        .is('parent_id', null)
        .order('display_order', { ascending: true });

      if (catError) throw catError;
      if (!cats?.length) return [];

      const catIds = cats.map(c => c.id);
      const now = new Date().toISOString();

      // 2. Batch fetch product counts and top images in one query
      const { data: products, error: prodError } = await supabase
        .from('products')
        .select('category_id, images')
        .in('category_id', catIds)
        .eq('is_active', true)
        .not('store_id', 'is', null)
        .or(`release_at.is.null,release_at.lte.${now}`);

      if (prodError) throw prodError;

      // 3. Aggregate counts and collect preview images per category
      const countMap: Record<string, { count: number; images: string[] }> = {};
      for (const p of products || []) {
        if (!countMap[p.category_id]) {
          countMap[p.category_id] = { count: 0, images: [] };
        }
        countMap[p.category_id].count++;
        if (countMap[p.category_id].images.length < 3 && Array.isArray(p.images) && p.images[0]) {
          countMap[p.category_id].images.push(p.images[0] as string);
        }
      }

      // 4. Merge and sort: categories with products first (by count desc), then empty
      const result: CategoryWithProducts[] = cats.map(c => ({
        ...c,
        product_count: countMap[c.id]?.count || 0,
        preview_images: countMap[c.id]?.images || [],
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
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

  const populated = categories.filter(c => c.product_count > 0);
  const empty = categories.filter(c => c.product_count === 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Browse by Category</h2>
        <Link to="/categories" className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-0.5">
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Populated categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {populated.map((category) => {
          const IconComponent = iconMap[category.icon || ''] || Package;
          return (
            <Link
              key={category.id}
              to={`/products?category=${category.slug}`}
              className="group flex items-center gap-3 px-3.5 py-3 rounded-lg bg-muted/30 hover:bg-muted/60 border border-transparent hover:border-primary/20 transition-all"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <IconComponent className="h-4.5 w-4.5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate">
                    {getTranslatedName(category.id, category.name)}
                  </span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                    {category.product_count}
                  </Badge>
                </div>
                {/* Product thumbnail previews */}
                {category.preview_images.length > 0 && (
                  <div className="flex gap-1 mt-1.5">
                    {category.preview_images.map((img, i) => (
                      <div key={i} className="h-7 w-7 rounded overflow-hidden bg-muted shrink-0">
                        <OptimizedImage
                          src={img}
                          alt=""
                          className="h-full w-full"
                          objectFit="cover"
                          blur={false}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Empty categories - compact muted row */}
      {empty.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {empty.map((category) => {
            const IconComponent = iconMap[category.icon || ''] || Package;
            return (
              <Link
                key={category.id}
                to={`/products?category=${category.slug}`}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted/20 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all text-xs"
              >
                <IconComponent className="h-3 w-3" />
                <span>{getTranslatedName(category.id, category.name)}</span>
                <span className="text-[10px] opacity-60">Soon</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
