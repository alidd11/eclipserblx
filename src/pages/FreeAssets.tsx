import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProductCard } from '@/components/ui/ProductCard';
import { ProductCardSkeleton } from '@/components/ui/ProductCardSkeleton';
import { usePageMeta } from '@/hooks/usePageMeta';

import { getFirstImageUrl } from '@/lib/mediaUtils';

type SortOption = 'newest' | 'popular' | 'downloads';

export default function FreeAssets() {
  usePageMeta({
    title: 'Free Assets — Eclipse',
    description: 'Download free Roblox assets — scripts, UI kits, models and more. No fees, no catch.',
    canonicalPath: '/free',
  });

  const [sort, setSort] = useState<SortOption>('popular');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const { data: categories } = useQuery({
    queryKey: ['free-assets-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data;
    },
    staleTime: 30 * 60 * 1000,
  });

  const sortColumn = sort === 'newest' ? 'created_at' : 'download_count';

  const { data: products, isLoading } = useQuery({
    queryKey: ['free-assets', sort, categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`
          id, name, slug, price, images, description, created_at, download_count,
          category_id, categories(name, slug),
          store_id, stores!inner(name, slug, logo_url, is_verified, is_active, eclipse_plus_discount_enabled)
        `)
        .eq('is_active', true)
        .eq('moderation_status', 'approved')
        .eq('stores.is_active', true)
        .eq('price', 0);

      if (categoryFilter) {
        query = query.eq('categories.slug', categoryFilter);
      }

      query = query.order(sortColumn, { ascending: false }).limit(40);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <MainLayout>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-display font-bold tracking-wide uppercase">Free Assets</h1>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex gap-1.5 flex-shrink-0">
            {(['popular', 'newest', 'downloads'] as SortOption[]).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors capitalize ${
                  sort === s
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-border flex-shrink-0" />

          <div className="flex gap-1.5">
            <button
              onClick={() => setCategoryFilter(null)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex-shrink-0 ${
                !categoryFilter
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              All
            </button>
            {categories?.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.slug)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex-shrink-0 whitespace-nowrap ${
                  categoryFilter === cat.slug
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : products?.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {products.map((product) => {
              const store = product.stores as any;
              const category = product.categories as any;
              return (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  slug={product.slug}
                  price={product.price}
                  image={getFirstImageUrl(product.images, 620, 465, 'contain')}
                  images={product.images as string[]}
                  category={category?.name}
                  categorySlug={category?.slug}
                  categoryId={product.category_id ?? undefined}
                  storeName={store?.name}
                  storeSlug={store?.slug}
                  storeLogo={store?.logo_url}
                  isVerified={store?.is_verified}
                  storeEclipseEnabled={store?.eclipse_plus_discount_enabled}
                  createdAt={product.created_at}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-sm text-muted-foreground">No free assets found in this category.</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
