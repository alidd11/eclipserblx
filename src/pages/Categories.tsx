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
  Building2
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

// Category images
import civilianVehiclesImg from '@/assets/categories/civilian-vehicles.jpg';
import markedPoliceImg from '@/assets/categories/marked-police.jpg';
import unmarkedPoliceImg from '@/assets/categories/unmarked-police.jpg';
import fireVehiclesImg from '@/assets/categories/fire-vehicles.jpg';
import ambulanceVehiclesImg from '@/assets/categories/ambulance-vehicles.jpg';
import aircraftImg from '@/assets/categories/aircraft.jpg';
import uniformsImg from '@/assets/categories/uniforms.jpg';
import militaryVehiclesImg from '@/assets/categories/military-vehicles.jpg';
import mapsImg from '@/assets/categories/maps.jpg';
import bundleDealsImg from '@/assets/categories/bundle-deals.jpg';
import botsImg from '@/assets/categories/bots.jpg';
import buildingsImg from '@/assets/categories/buildings.jpg';

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

// Category background images
const categoryImages: Record<string, string> = {
  'civilian-vehicles': civilianVehiclesImg,
  'marked-police-vehicles': markedPoliceImg,
  'unmarked-police-vehicles': unmarkedPoliceImg,
  'fire-vehicles': fireVehiclesImg,
  'ambulance-vehicles': ambulanceVehiclesImg,
  'aircraft': aircraftImg,
  'uniforms': uniformsImg,
  'military-vehicles': militaryVehiclesImg,
  'maps': mapsImg,
  'bundle-deals': bundleDealsImg,
  'bots': botsImg,
  'buildings': buildingsImg,
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

  // Build category data for rendering
  const categoryData = categories?.map((category) => {
    const Icon = categoryIcons[category.slug] || Package;
    const productCount = category.product_count || 0;
    const bgImage = categoryImages[category.slug];
    const useRegionSelect = REGIONAL_CATEGORY_SLUGS.includes(category.slug) && category.has_sub_categories;
    const linkTo = useRegionSelect
      ? `/browse/${category.slug}/region${isMarketplace ? '?source=marketplace' : ''}`
      : `/products?category=${category.slug}${isMarketplace ? '&source=marketplace' : ''}`;
    
    return { ...category, Icon, productCount, bgImage, linkTo };
  }) || [];

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

        {/* Categories - Names above, Images below */}
        {isLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="h-10 sm:h-12 rounded-xl" />
                <Skeleton className="aspect-square rounded-xl" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
            {categoryData.map((category) => (
              <div key={category.id} className="flex flex-col gap-2">
                {/* Category Name - Above its image */}
                <div
                  className={`min-w-0 bg-card border border-border rounded-xl py-2 sm:py-3 px-2 sm:px-3 text-center shadow-sm ${
                    category.productCount === 0 ? 'opacity-50' : ''
                  }`}
                >
                  <span className="block text-[10px] sm:text-xs font-semibold text-foreground truncate">
                    {category.name}
                  </span>
                </div>

                {/* Category Image */}
                <Link
                  to={category.linkTo}
                  className={`group relative aspect-square rounded-xl overflow-hidden border border-border hover:border-primary/50 hover:shadow-xl transition-all duration-300 ${
                    category.productCount === 0 ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  {category.bgImage && (
                    <img 
                      src={category.bgImage} 
                      alt={category.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  )}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}