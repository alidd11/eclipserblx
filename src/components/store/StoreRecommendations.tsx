import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProductCard } from '@/components/ui/ProductCard';
import { ProductCardSkeleton } from '@/components/ui/ProductCardSkeleton';
import { Star } from 'lucide-react';

interface StoreRecommendationsProps {
  storeId: string;
  storeName: string;
  categoryIds?: string[];
  accentColor?: string;
  limit?: number;
}

interface RecommendedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[] | null;
  categories: { name: string } | null;
  is_resellable?: boolean;
}

export const StoreRecommendations = ({
  storeId,
  storeName,
  categoryIds = [],
  accentColor = '#8b5cf6',
  limit = 4,
}: StoreRecommendationsProps) => {
  const { data: recommendations, isLoading } = useQuery({
    queryKey: ['store-recommendations', storeId, categoryIds, limit],
    queryFn: async (): Promise<RecommendedProduct[]> => {
      // Strategy 1: Find products from same categories but different stores
      if (categoryIds.length > 0) {
        const { data: similarProducts } = await supabase
          .from('products')
          .select('id, name, slug, price, images, is_resellable, categories(name)')
          .in('category_id', categoryIds)
          .neq('store_id', storeId)
          .eq('is_active', true)
          .eq('moderation_status', 'approved')
          .order('download_count', { ascending: false })
          .limit(limit);

        if (similarProducts && similarProducts.length >= limit) {
          return similarProducts as RecommendedProduct[];
        }

        // Strategy 2: Fill with popular products from other stores
        const existingIds = similarProducts?.map(p => p.id) || [];
        const needed = limit - (similarProducts?.length || 0);

        const { data: popularProducts } = await supabase
          .from('products')
          .select('id, name, slug, price, images, is_resellable, categories(name)')
          .neq('store_id', storeId)
          .eq('is_active', true)
          .eq('moderation_status', 'approved')
          .order('download_count', { ascending: false })
          .limit(needed + existingIds.length);

        const filtered = popularProducts?.filter(p => !existingIds.includes(p.id)).slice(0, needed) || [];
        return [...(similarProducts || []), ...filtered] as RecommendedProduct[];
      }

      // Fallback: Just get popular products from other stores
      const { data: popularProducts } = await supabase
        .from('products')
        .select('id, name, slug, price, images, is_resellable, categories(name)')
        .neq('store_id', storeId)
        .eq('is_active', true)
        .eq('moderation_status', 'approved')
        .order('download_count', { ascending: false })
        .limit(limit);

      return (popularProducts || []) as RecommendedProduct[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!storeId,
  });

  if (isLoading) {
    return (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-6">
          <Star className="h-5 w-5" style={{ color: accentColor }} />
          <h2 className="text-xl font-bold">You May Also Like</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: limit }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!recommendations?.length) {
    return null;
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-6">
        <Star className="h-5 w-5" style={{ color: accentColor }} />
        <h2 className="text-xl font-bold">You May Also Like</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {recommendations.map((product) => (
          <ProductCard
            key={product.id}
            id={product.id}
            name={product.name}
            price={product.price}
            image={product.images?.[0] || '/placeholder.svg'}
            slug={product.slug}
            category={product.categories?.name}
            isResellable={product.is_resellable}
          />
        ))}
      </div>
    </div>
  );
};
