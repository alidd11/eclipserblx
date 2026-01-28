import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Globe } from 'lucide-react';
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

interface Region {
  code: 'uk' | 'us' | 'eu';
  name: string;
  flag: string;
  slug: string;
  productCount: number;
}

const REGION_CONFIG = [
  { code: 'uk' as const, name: 'United Kingdom', flag: '🇬🇧', prefix: 'uk-' },
  { code: 'us' as const, name: 'United States', flag: '🇺🇸', prefix: 'us-' },
  { code: 'eu' as const, name: 'European Union', flag: '🇪🇺', prefix: 'eu-' },
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
      const regions: Region[] = await Promise.all(
        REGION_CONFIG.map(async (region) => {
          const subCategory = subCategories?.find((sc) =>
            sc.slug.startsWith(region.prefix)
          );

          if (!subCategory) {
            return {
              code: region.code,
              name: region.name,
              flag: region.flag,
              slug: '',
              productCount: 0,
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
            flag: region.flag,
            slug: subCategory.slug,
            productCount: count || 0,
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

  const gradientMap: Record<string, string> = {
    uk: 'from-blue-500/20 via-red-500/10 to-white/10',
    us: 'from-red-500/20 via-white/10 to-blue-500/20',
    eu: 'from-blue-600/20 to-yellow-500/10',
  };

  const categoriesLink = isMarketplace ? '/categories?source=marketplace' : '/categories';
  const sourceParam = isMarketplace ? '&source=marketplace' : '';

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container py-8 space-y-8">
          <Skeleton className="h-6 w-48" />
          <div className="text-center space-y-4">
            <Skeleton className="h-10 w-64 mx-auto" />
            <Skeleton className="h-6 w-48 mx-auto" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-56 rounded-xl" />
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
              <Link to={categoriesLink}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Categories
              </Link>
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8 space-y-8">
        {/* Breadcrumb */}
        <Breadcrumb>
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
        <div className="text-center space-y-3">
          <h1 className="text-3xl md:text-4xl font-display font-bold">
            Select Your Region
          </h1>
          <p className="text-xl text-muted-foreground">
            {data.parentCategory.name}
          </p>
        </div>

        {/* Region Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {data.regions.map((region) => (
            <Link
              key={region.code}
              to={region.slug ? `/products?category=${region.slug}${sourceParam}` : '#'}
              className={`group relative overflow-hidden rounded-xl border border-border bg-card p-8 text-center transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 ${
                !region.slug ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${gradientMap[region.code]} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
              />

              <div className="relative z-10 space-y-4">
                <span className="text-7xl block animate-fade-in">{region.flag}</span>
                <div>
                  <h3 className="font-display font-semibold text-xl group-hover:text-primary transition-colors">
                    {region.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {region.productCount} {region.productCount === 1 ? 'item' : 'items'}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center">
          <Button variant="outline" size="lg" asChild>
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
