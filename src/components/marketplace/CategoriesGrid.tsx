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
      const { data: cats, error: catError } = await supabase
        .from('categories')
        .select('id, name, slug, description, icon, parent_id, display_order')
        .is('parent_id', null)
        .order('display_order', { ascending: true });

      if (catError) throw catError;
      if (!cats?.length) return [];

      const catIds = cats.map(c => c.id);
      const now = new Date().toISOString();

      const { data: products, error: prodError } = await supabase
        .from('products')
        .select('category_id, images')
        .in('category_id', catIds)
        .eq('is_active', true)
        .not('store_id', 'is', null)
        .or(`release_at.is.null,release_at.lte.${now}`);

      if (prodError) throw prodError;

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

      {/* Populated categories — visual cards with image collage */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {populated.map((category) => {
          const IconComponent = iconMap[category.icon || ''] || Package;
          const hasImages = category.preview_images.length > 0;

          return (
            <Link
              key={category.id}
              to={`/products?category=${category.slug}`}
              className="group relative flex flex-col overflow-hidden rounded-[0.375rem] border border-border bg-card hover:border-primary/30 transition-all"
            >
              {/* Image area */}
              <div className="relative aspect-[16/10] bg-muted overflow-hidden">
                {hasImages ? (
                  <div className="absolute inset-0 grid grid-cols-3 gap-px">
                    {category.preview_images.map((img, i) => (
                      <div key={i} className="relative overflow-hidden">
                        <OptimizedImage
                          src={img}
                          alt=""
                          className="h-full w-full"
                          objectFit="cover"
                          blur={false}
                        />
                      </div>
                    ))}
                    {/* Fill remaining slots with muted bg */}
                    {Array.from({ length: Math.max(0, 3 - category.preview_images.length) }).map((_, i) => (
                      <div key={`empty-${i}`} className="bg-muted/60" />
                    ))}
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <IconComponent className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                )}
                {/* Gradient overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent opacity-80 group-hover:opacity-70 transition-opacity" />
                {/* Count pill */}
                <div className="absolute top-1.5 right-1.5 bg-card/80 text-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded-[0.25rem] border border-border">
                  {category.product_count}
                </div>
              </div>

              {/* Info strip */}
              <div className="flex items-center gap-2 px-2.5 py-2 bg-muted/60">
                <div className="h-6 w-6 rounded-[0.25rem] bg-primary/10 flex items-center justify-center shrink-0">
                  <IconComponent className="h-3 w-3 text-primary" />
                </div>
                <span className="font-medium text-xs text-foreground group-hover:text-primary transition-colors truncate">
                  {getTranslatedName(category.id, category.name)}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Empty categories — compact chip row */}
      {empty.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {empty.map((category) => {
            const IconComponent = iconMap[category.icon || ''] || Package;
            return (
              <Link
                key={category.id}
                to={`/products?category=${category.slug}`}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[0.375rem] border border-border/50 bg-muted/20 text-muted-foreground hover:text-foreground hover:bg-muted/40 hover:border-border transition-all text-xs"
              >
                <IconComponent className="h-3 w-3 opacity-60" />
                <span>{getTranslatedName(category.id, category.name)}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
