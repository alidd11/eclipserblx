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
        <div className="mb-6 sm:mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Categories
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse our collection by category
          </p>
        </div>

        {/* Categories Tile Grid */}
        {isLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
            {[...Array(12)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
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
                  className="group flex flex-col items-center justify-center aspect-square rounded-xl bg-card border border-border hover:bg-muted/50 hover:border-primary/30 hover:shadow-md transition-all p-3"
                >
                  <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-muted group-hover:bg-primary/10 transition-colors mb-2">
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-foreground/70 group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-center leading-tight line-clamp-2">
                    {category.name}
                  </span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                    {productCount}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}