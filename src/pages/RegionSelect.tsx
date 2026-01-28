import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Globe } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';

// Region flag images
import ukFlagImg from '@/assets/regions/uk-flag.jpg';
import usFlagImg from '@/assets/regions/us-flag.jpg';
import euFlagImg from '@/assets/regions/eu-flag.jpg';

interface Region {
  code: 'uk' | 'us' | 'eu';
  name: string;
  slug: string;
  productCount: number;
}

const REGION_CONFIG = [
  { code: 'uk' as const, name: 'United Kingdom', prefix: 'uk-', image: ukFlagImg },
  { code: 'us' as const, name: 'United States', prefix: 'us-', image: usFlagImg },
  { code: 'eu' as const, name: 'European Union', prefix: 'eu-', image: euFlagImg },
];

export default function RegionSelect() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const [searchParams] = useSearchParams();
  const sourceFilter = searchParams.get('source');
  const isMarketplace = sourceFilter === 'marketplace';

  const { data, isLoading } = useQuery({
    queryKey: ['region-select', categorySlug, sourceFilter],
    queryFn: async () => {
      // Fetch parent category
      const { data: parentCategory, error: parentError } = await supabase
        .from('categories')
        .select('id, name, slug')
        .eq('slug', categorySlug)
        .maybeSingle();

      if (parentError) throw parentError;
      if (!parentCategory) return null;

      // Fetch sub-categories for this parent
      const { data: subCategories, error: subError } = await supabase
        .from('categories')
        .select('id, name, slug')
        .eq('parent_id', parentCategory.id);

      if (subError) throw subError;

      // Get product counts for each regional sub-category
      const now = new Date().toISOString();
      const regions: (Region & { image: string })[] = await Promise.all(
        REGION_CONFIG.map(async (region) => {
          const subCategory = subCategories?.find((sc) =>
            sc.slug.startsWith(region.prefix)
          );

          if (!subCategory) {
            return {
              code: region.code,
              name: region.name,
              slug: '',
              productCount: 0,
              image: region.image,
            };
          }

          let countQuery = supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('category_id', subCategory.id)
            .eq('is_active', true)
            .or(`release_at.is.null,release_at.lte.${now}`);

          if (isMarketplace) {
            countQuery = countQuery.not('store_id', 'is', null);
          }

          const { count } = await countQuery;

          return {
            code: region.code,
            name: region.name,
            slug: subCategory.slug,
            productCount: count || 0,
            image: region.image,
          };
        })
      );

      // Get total count for "View All" option
      const allSubCategoryIds = subCategories?.map((sc) => sc.id) || [];
      let totalCount = 0;

      if (allSubCategoryIds.length > 0) {
        let totalQuery = supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .in('category_id', allSubCategoryIds)
          .eq('is_active', true)
          .or(`release_at.is.null,release_at.lte.${now}`);

        if (isMarketplace) {
          totalQuery = totalQuery.not('store_id', 'is', null);
        }

        const { count } = await totalQuery;
        totalCount = count || 0;
      }

      return {
        parentCategory,
        regions,
        totalCount,
      };
    },
    enabled: !!categorySlug,
  });

  const categoriesLink = isMarketplace ? '/categories?source=marketplace' : '/categories';
  const sourceParam = isMarketplace ? '&source=marketplace' : '';

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container flex flex-col min-h-[calc(100dvh-8rem)] py-6 sm:py-8">
          <Skeleton className="h-5 w-48 mb-6" />
          <div className="text-center space-y-2 mb-6">
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-5 w-32 mx-auto" />
          </div>
          <div className="grid grid-cols-3 gap-4 sm:gap-6 max-w-3xl mx-auto w-full mb-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={`name-${i}`} className="h-12 rounded-xl" />
            ))}
          </div>
          <div className="flex-1 grid grid-cols-3 gap-4 sm:gap-6 max-w-3xl mx-auto w-full">
            {[1, 2, 3].map((i) => (
              <Skeleton key={`flag-${i}`} className="min-h-[250px] rounded-2xl" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!data?.parentCategory) {
    return (
      <MainLayout>
        <div className="container py-8">
          <div className="text-center py-16">
            <h1 className="text-2xl font-display font-bold mb-4">Category Not Found</h1>
            <p className="text-muted-foreground mb-6">
              The category you're looking for doesn't exist.
            </p>
            <Button asChild>
              <Link to={categoriesLink}>Back to Categories</Link>
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container flex flex-col min-h-[calc(100dvh-8rem)] py-6 sm:py-8">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={categoriesLink}>Categories</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{data.parentCategory.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-widest text-center bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
            Select Your Region
          </h1>
        </div>

        {/* Country Names - Each in own card, aligned to flags */}
        <div className="grid grid-cols-3 gap-4 sm:gap-6 max-w-3xl mx-auto w-full mb-4">
          {data.regions.map((region) => (
            <div
              key={`name-${region.code}`}
              className={`min-w-0 bg-card border border-border rounded-xl py-3 px-4 text-center shadow-sm ${
                !region.slug ? 'opacity-50' : ''
              }`}
            >
              <span className="block text-xs sm:text-sm font-semibold text-foreground truncate">
                {region.name}
              </span>
            </div>
          ))}
        </div>

        {/* Flag Images - Inline row */}
        <div className="flex-1 grid grid-cols-3 gap-4 sm:gap-6 max-w-3xl mx-auto w-full">
          {data.regions.map((region) => (
            <Link
              key={region.code}
              to={region.slug ? `/products?category=${region.slug}${sourceParam}` : '#'}
              className={`group relative min-w-0 rounded-2xl overflow-hidden border border-border shadow-md hover:shadow-xl hover:border-primary/50 transition-all duration-300 ${
                !region.slug ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <img
                src={region.image}
                alt={`${region.name} flag`}
                className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
              />
            </Link>
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center mt-6">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/products?category=${categorySlug}${sourceParam}`}>
              <Globe className="mr-2 h-4 w-4" />
              View All Regions ({data.totalCount} items)
            </Link>
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
