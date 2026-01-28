import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Car, 
  Shield, 
  ShieldOff, 
  Flame, 
  Ambulance, 
  Plane, 
  Shirt, 
  Swords,
  Map,
  Package,
  Bot,
  Building2,
  ChevronRight
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

// Category icon mapping
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

export default function Categories() {
  const [searchParams] = useSearchParams();
  const sourceFilter = searchParams.get('source');
  const isMarketplace = sourceFilter === 'marketplace';

  // Categories that should use the region selection flow
  const REGIONAL_CATEGORY_SLUGS = [
    'civilian-vehicles',
    'marked-police-vehicles',
    'unmarked-police-vehicles',
    'fire-vehicles',
    'ambulance-vehicles',
    'military-vehicles',
    'aircraft',
    'uniforms',
  ];

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories-page', sourceFilter],
    queryFn: async () => {
      // Fetch only parent categories (those without a parent_id)
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug, description, display_order, parent_id')
        .is('parent_id', null)
        .order('display_order', { ascending: true });

      if (error) throw error;

      // Get product counts for each category with source filter
      const now = new Date().toISOString();
      const categoriesWithCounts = await Promise.all(
        (data || []).map(async (category) => {
          // Check if this category has sub-categories
          const { data: subCategories } = await supabase
            .from('categories')
            .select('id')
            .eq('parent_id', category.id);

          const hasSubCategories = (subCategories?.length || 0) > 0;
          const subCategoryIds = subCategories?.map((sc) => sc.id) || [];

          // Count products in either this category or its sub-categories
          let countQuery = supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('is_active', true)
            .or(`release_at.is.null,release_at.lte.${now}`);

          if (hasSubCategories) {
            // Count products in all sub-categories
            countQuery = countQuery.in('category_id', [...subCategoryIds, category.id]);
          } else {
            countQuery = countQuery.eq('category_id', category.id);
          }

          // Filter to marketplace-only products when source=marketplace
          if (isMarketplace) {
            countQuery = countQuery.not('store_id', 'is', null);
          }

          const { count } = await countQuery;

          return {
            ...category,
            product_count: count || 0,
            has_sub_categories: hasSubCategories,
          };
        })
      );

      return categoriesWithCounts;
    },
  });

  return (
    <MainLayout>
      <div className="container py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Categories
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse our collection by category
          </p>
        </div>

        {/* Categories List */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {categories?.map((category) => {
              const Icon = categoryIcons[category.slug] || Package;
              const productCount = category.product_count || 0;

              // Determine if this category should use region selection
              const useRegionSelect = REGIONAL_CATEGORY_SLUGS.includes(category.slug) && category.has_sub_categories;
              const linkTo = useRegionSelect
                ? `/browse/${category.slug}/region${isMarketplace ? '?source=marketplace' : ''}`
                : `/products?category=${category.slug}${isMarketplace ? '&source=marketplace' : ''}`;

              return (
                <Link
                  key={category.id}
                  to={linkTo}
                  className="group flex items-center justify-between px-4 py-3.5 rounded-lg bg-card border border-border hover:bg-muted/50 hover:border-muted-foreground/20 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                      <Icon className="h-5 w-5 text-foreground/70" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm sm:text-base">
                        {category.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {productCount} {productCount === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}