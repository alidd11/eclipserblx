import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Filter, Search, Grid3X3, LayoutGrid } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProductCard } from '@/components/ui/ProductCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { CATEGORIES } from '@/lib/constants';

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categorySlug = searchParams.get('category');
  const [search, setSearch] = useState('');
  const [gridSize, setGridSize] = useState<'small' | 'large'>('large');

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
      <div className="container py-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-display font-bold">
            {activeCategory ? activeCategory.name : 'All Products'}
          </h1>
          <p className="text-muted-foreground">
            {activeCategory?.description || 'Browse our collection of premium roleplay assets'}
          </p>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-card border-border"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={gridSize === 'large' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setGridSize('large')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={gridSize === 'small' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setGridSize('small')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full lg:w-64 space-y-4">
            <h3 className="font-display font-semibold flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Categories
            </h3>
            <nav className="space-y-1">
              <Link
                to="/products"
                className={`block px-3 py-2 rounded-lg transition-colors ${
                  !categorySlug
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                All Products
              </Link>
              {categories?.map((category) => (
                <Link
                  key={category.id}
                  to={`/products?category=${category.slug}`}
                  className={`block px-3 py-2 rounded-lg transition-colors ${
                    categorySlug === category.slug
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {category.name}
                </Link>
              ))}
            </nav>
          </aside>

          {/* Products Grid */}
          <div className="flex-1">
            {isLoading ? (
              <div className={`grid gap-4 ${
                gridSize === 'large'
                  ? 'grid-cols-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4'
                  : 'grid-cols-3 sm:grid-cols-4 xl:grid-cols-5'
              }`}>
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
              <div className={`grid gap-4 ${
                gridSize === 'large'
                  ? 'grid-cols-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4'
                  : 'grid-cols-3 sm:grid-cols-4 xl:grid-cols-5'
              }`}>
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
        </div>
      </div>
    </MainLayout>
  );
}
