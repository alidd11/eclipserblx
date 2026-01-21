import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Filter, Search, ChevronDown, Package, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProductCard } from '@/components/ui/ProductCard';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { CATEGORIES } from '@/lib/constants';
import { FeaturedProductsCard } from '@/components/home/FeaturedProductsCard';
import { useIsMobile } from '@/hooks/use-mobile';

type SortOption = 'smart' | 'newest' | 'oldest' | 'price-low' | 'price-high' | 'popularity';

// 4 rows: 16 products on desktop (4 cols), 12 on mobile (3 cols)
const PRODUCTS_PER_PAGE_DESKTOP = 16;
const PRODUCTS_PER_PAGE_MOBILE = 12;

export default function Products() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const categorySlug = searchParams.get('category');
  const featuredOnly = searchParams.get('featured') === 'true';
  const pageParam = searchParams.get('page');
  const [search, setSearch] = useState('');
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('smart');
  const currentPage = pageParam ? parseInt(pageParam, 10) : 1;

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['products'] });
    await queryClient.invalidateQueries({ queryKey: ['categories'] });
  }, [queryClient]);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', categorySlug, search, featuredOnly, sortBy],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`*, categories(name, slug), stores!inner(is_active)`)
        .eq('is_active', true)
        .eq('stores.is_active', true);

      // Filter out products that are scheduled for the future
      query = query.or('release_at.is.null,release_at.lte.' + new Date().toISOString());

      if (categorySlug) {
        const category = categories?.find(c => c.slug === categorySlug);
        if (category) {
          query = query.eq('category_id', category.id);
        }
      }

      if (featuredOnly) {
        query = query.eq('is_featured', true);
      }

      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Sort products based on selected sort option
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      
      const sorted = (data || []).sort((a, b) => {
        switch (sortBy) {
          case 'newest':
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          case 'oldest':
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          case 'price-low':
            return a.price - b.price;
          case 'price-high':
            return b.price - a.price;
          case 'popularity':
            return (b.download_count || 0) - (a.download_count || 0);
          case 'smart':
          default:
            // Featured products first
            if (a.is_featured && !b.is_featured) return -1;
            if (!a.is_featured && b.is_featured) return 1;
            
            // Among non-featured, new products (within 3 days) come next
            const aIsNew = new Date(a.created_at) > threeDaysAgo;
            const bIsNew = new Date(b.created_at) > threeDaysAgo;
            
            if (aIsNew && !bIsNew) return -1;
            if (!aIsNew && bIsNew) return 1;
            
            // If both are new, sort by newest first
            if (aIsNew && bIsNew) {
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
            
            // Otherwise, sort by popularity (download_count)
            return (b.download_count || 0) - (a.download_count || 0);
        }
      });
      
      return sorted;
    },
    enabled: categories !== undefined || !categorySlug,
  });

  const sortOptions = [
    { value: 'smart', label: 'Smart Sort' },
    { value: 'popularity', label: 'Most Popular' },
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
  ];

  const activeCategory = categories?.find(c => c.slug === categorySlug);

  return (
    <MainLayout>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="container py-8 space-y-6">
        {/* Combined Header & Filter Card */}
        <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
          <CardContent className="p-4 space-y-3">
            {/* Title Row */}
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary/80" />
              <h1 className="text-lg font-display text-foreground">
                {featuredOnly ? 'Featured Products' : activeCategory ? activeCategory.name : 'All Products'}
              </h1>
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground">
              {featuredOnly ? 'Discover our handpicked premium assets' : activeCategory?.description || 'Browse our collection of premium roleplay assets'}
            </p>

            {/* Search, Sort & Categories Row */}
            <div className="flex items-center gap-2">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
                <Input
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm bg-background/50 border-border/50 focus:border-primary/50 w-full"
                />
              </div>

              {/* Sort Dropdown */}
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger className="w-auto h-9 text-sm bg-muted/30 border-border/50 gap-1.5 px-2.5">
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="hidden sm:inline"><SelectValue /></span>
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Categories Filter */}
              <Collapsible open={categoriesOpen} onOpenChange={setCategoriesOpen}>
                <CollapsibleTrigger className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-2.5 py-2 rounded-md bg-muted/30 hover:bg-muted/50 h-9">
                  <Filter className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="hidden sm:inline truncate max-w-[100px]">{activeCategory ? activeCategory.name : 'Filter'}</span>
                  <ChevronDown className={`h-3.5 w-3.5 flex-shrink-0 transition-transform duration-200 ${categoriesOpen ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
              </Collapsible>
            </div>

            {/* Categories Dropdown */}
            {categoriesOpen && (
              <nav className="flex flex-wrap gap-2 pt-1">
                <Link
                  to="/products"
                  onClick={() => setCategoriesOpen(false)}
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                    !categorySlug
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  All
                </Link>
                {categories?.map((category) => (
                  <Link
                    key={category.id}
                    to={`/products?category=${category.slug}`}
                    onClick={() => setCategoriesOpen(false)}
                    className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                      categorySlug === category.slug
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {category.name}
                  </Link>
                ))}
              </nav>
            )}
          </CardContent>
        </Card>

        {/* Products Grid */}
        <ProductsGridWrapper 
          products={products}
          isLoading={isLoading}
          currentPage={currentPage}
          search={search}
          setSearch={setSearch}
          searchParams={searchParams}
          setSearchParams={setSearchParams}
          categorySlug={categorySlug}
          featuredOnly={featuredOnly}
        />

        {/* Featured Products Card */}
        <FeaturedProductsCard />
        </div>
      </PullToRefresh>
    </MainLayout>
  );
}

// Wrapper to use the mobile hook at component level
function ProductsGridWrapper(props: Omit<ProductsGridProps, 'productsPerPage'>) {
  const isMobile = useIsMobile();
  const productsPerPage = isMobile ? PRODUCTS_PER_PAGE_MOBILE : PRODUCTS_PER_PAGE_DESKTOP;
  return <ProductsGrid {...props} productsPerPage={productsPerPage} />;
}

// Extracted component for products grid with pagination
interface ProductsGridProps {
  products: any[] | undefined;
  isLoading: boolean;
  currentPage: number;
  search: string;
  setSearch: (value: string) => void;
  searchParams: URLSearchParams;
  setSearchParams: (params: URLSearchParams | Record<string, string>, options?: { replace?: boolean }) => void;
  categorySlug: string | null;
  featuredOnly: boolean;
  productsPerPage: number;
}

function ProductsGrid({ 
  products, 
  isLoading, 
  currentPage, 
  search, 
  setSearch, 
  searchParams, 
  setSearchParams,
  categorySlug,
  featuredOnly,
  productsPerPage
}: ProductsGridProps) {
  // Calculate pagination
  const totalProducts = products?.length ?? 0;
  const totalPages = Math.ceil(totalProducts / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const endIndex = startIndex + productsPerPage;
  const paginatedProducts = products?.slice(startIndex, endIndex) ?? [];

  const goToPage = (page: number) => {
    const newParams = new URLSearchParams(searchParams);
    if (page === 1) {
      newParams.delete('page');
    } else {
      newParams.set('page', page.toString());
    }
    setSearchParams(newParams, { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 grid-cols-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {[...Array(productsPerPage)].map((_, i) => (
          <div key={i} className="gaming-card animate-pulse">
            <div className="aspect-video bg-muted" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-muted rounded w-1/4" />
              <div className="h-5 bg-muted rounded w-3/4" />
              <div className="h-8 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products?.length === 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-xl text-muted-foreground">No products found</p>
        <Button variant="outline" onClick={() => {
          setSearch('');
          const newParams = new URLSearchParams();
          setSearchParams(newParams);
        }}>
          Clear filters
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {paginatedProducts.map((product) => (
          <ProductCard
            key={product.id}
            id={product.id}
            name={product.name}
            slug={product.slug}
            price={product.price}
            image={product.images?.[0]}
            images={product.images}
            category={product.categories?.name}
            categorySlug={product.categories?.slug}
            categoryId={product.category_id}
            isFeatured={product.is_featured}
            createdAt={product.created_at}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Previous</span>
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              // Show first, last, current, and adjacent pages
              const showPage = 
                page === 1 || 
                page === totalPages || 
                Math.abs(page - currentPage) <= 1;
              
              const showEllipsis = 
                (page === 2 && currentPage > 3) ||
                (page === totalPages - 1 && currentPage < totalPages - 2);

              if (showEllipsis && !showPage) {
                return (
                  <span key={page} className="px-2 text-muted-foreground">
                    ...
                  </span>
                );
              }

              if (!showPage) return null;

              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => goToPage(page)}
                  className="min-w-[36px]"
                >
                  {page}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="gap-1"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Page info */}
      {totalPages > 1 && (
        <p className="text-center text-sm text-muted-foreground">
          Showing {startIndex + 1}-{Math.min(endIndex, totalProducts)} of {totalProducts} products
        </p>
      )}
    </div>
  );
}
