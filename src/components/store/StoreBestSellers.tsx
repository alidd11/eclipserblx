import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProductCard } from '@/components/ui/ProductCard';
import { ProductCardSkeleton } from '@/components/ui/ProductCardSkeleton';
import { TrendingUp } from 'lucide-react';

interface StoreBestSellersProps {
  storeId: string;
  storeName: string;
  accentColor: string;
  limit?: number;
}

export function StoreBestSellers({ 
  storeId, 
  storeName, 
  accentColor,
  limit = 4 
}: StoreBestSellersProps) {
  const { data: bestSellers, isLoading } = useQuery({
    queryKey: ['store-best-sellers', storeId, limit],
    queryFn: async () => {
      // Optimized: Select only needed columns (note: average_rating is not stored on products table)
      const { data, error } = await supabase
        .from('products')
        .select('id, name, slug, price, images, is_resellable, download_count, categories(name)')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .eq('moderation_status', 'approved')
        .order('download_count', { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      // Only return products with at least 1 download
      return (data || []).filter(p => (p.download_count || 0) > 0);
    },
    enabled: !!storeId,
    staleTime: 30000, // 30 seconds cache
  });

  // Don't render if no best sellers
  if (!isLoading && (!bestSellers || bestSellers.length === 0)) {
    return null;
  }

  return (
    <div className="w-full py-6">
      <div className="flex items-center gap-2 mb-4">
        <div 
          className="p-2 rounded-lg"
          style={{ backgroundColor: `${accentColor}15` }}
        >
          <TrendingUp className="h-5 w-5" style={{ color: accentColor }} />
        </div>
        <div>
          <h3 className="text-lg font-bold">Best Sellers</h3>
          <p className="text-xs text-muted-foreground">
            Most popular from {storeName}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {bestSellers?.map((product: any) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              price={product.price}
              image={product.images?.[0] || '/placeholder.svg'}
              slug={product.slug}
              category={(product.categories as any)?.name}
              isResellable={product.is_resellable}
              showBestSellerBadge
            />
          ))}
        </div>
      )}
    </div>
  );
}
