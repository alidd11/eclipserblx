import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Package, ArrowRight } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { FeaturedProducts } from '@/components/home/FeaturedProducts';

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

  const gradientMap: Record<number, string> = {
    0: 'from-purple-500/20 to-purple-600/20',
    1: 'from-blue-500/20 to-blue-600/20',
    2: 'from-emerald-500/20 to-emerald-600/20',
    3: 'from-amber-500/20 to-amber-600/20',
    4: 'from-rose-500/20 to-rose-600/20',
    5: 'from-cyan-500/20 to-cyan-600/20',
  };

  const iconColorMap: Record<number, string> = {
    0: 'text-purple-400',
    1: 'text-blue-400',
    2: 'text-emerald-400',
    3: 'text-amber-400',
    4: 'text-rose-400',
    5: 'text-cyan-400',
  };

  return (
    <MainLayout>
      <div className="container py-8 space-y-12">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-display font-bold">
            Browse Categories
          </h1>
          <p className="text-muted-foreground">
            Explore our collection of premium roleplay assets by category
          </p>
        </div>

        {/* Categories Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="gaming-card p-6">
                <Skeleton className="h-12 w-12 rounded-lg mb-4" />
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-full mb-4" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories?.map((category, index) => {
              const gradient = gradientMap[index % 6];
              const iconColor = iconColorMap[index % 6];
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
                  className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  
                  <div className="relative z-10">
                    <div className={`mb-4 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 ${iconColor}`}>
                      <Package className="h-6 w-6" />
                    </div>
                    
                    <h3 className="font-display font-semibold text-xl mb-2 group-hover:text-primary transition-colors">
                      {category.name}
                    </h3>
                    
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {category.description || 'Browse our collection'}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {productCount} {productCount === 1 ? 'product' : 'products'}
                      </span>
                      <div className="flex items-center text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>Browse</span>
                        <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Featured Products Section */}
        <FeaturedProducts />
      </div>
    </MainLayout>
  );
}