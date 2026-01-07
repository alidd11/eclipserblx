import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Filter, Search, ChevronDown, Package } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProductCard } from '@/components/ui/ProductCard';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { CATEGORIES } from '@/lib/constants';
import { FeaturedProducts } from '@/components/home/FeaturedProducts';

export default function Products() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const categorySlug = searchParams.get('category');
  const [search, setSearch] = useState('');
  const [categoriesOpen, setCategoriesOpen] = useState(false);

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
    queryKey: ['products', categorySlug, search],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`*, categories(name, slug)`)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (categorySlug) {
        const category = categories?.find(c => c.slug === categorySlug);
        if (category) {
          query = query.eq('category_id', category.id);
        }
      }

      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: categories !== undefined || !categorySlug,
  });

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
                {activeCategory ? activeCategory.name : 'All Products'}
              </h1>
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground">
              {activeCategory?.description || 'Browse our collection of premium roleplay assets'}
            </p>

            {/* Search Bar - Full Width */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm bg-background/50 border-border/50 focus:border-primary/50 w-full"
              />
            </div>

            {/* Categories Filter */}
            <Collapsible open={categoriesOpen} onOpenChange={setCategoriesOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Filter className="h-3.5 w-3.5" />
                <span>Categories</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${categoriesOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                <nav className="flex flex-wrap gap-2">
                  <Link
                    to="/products"
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
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        {/* Products Grid */}
        <div>
          {isLoading ? (
            <div className="grid gap-4 grid-cols-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {[...Array(6)].map((_, i) => (
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
          ) : products?.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <p className="text-xl text-muted-foreground">No products found</p>
              <Button variant="outline" onClick={() => {
                setSearch('');
                setSearchParams({});
              }}>
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {products?.map((product) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  slug={product.slug}
                  price={product.price}
                  image={product.images?.[0]}
                  category={product.categories?.name}
                  isFeatured={product.is_featured}
                />
              ))}
            </div>
          )}
        </div>

        {/* Featured Products Section */}
        <FeaturedProducts />
        </div>
      </PullToRefresh>
    </MainLayout>
  );
}
