import { Link } from 'react-router-dom';
import { ChevronRight, ShieldCheck, Award } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';

interface FeaturedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[] | null;
  average_rating: number | null;
  review_count: number | null;
  stores: {
    name: string;
    slug: string;
    logo_url: string | null;
    is_verified: boolean;
    is_trusted: boolean;
  } | null;
}

// Admin-managed store slugs for featured products
const FEATURED_STORE_SLUGS = ['eclipse-store', 'vino-store'];

function useAlgorithmicProducts() {
  return useQuery({
    queryKey: ['pwa-featured-products'],
    queryFn: async () => {
      const now = new Date().toISOString();
      
      // Fetch active products from Eclipse and Vino stores only
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, slug, price, images, average_rating, review_count,
          stores!inner (name, slug, logo_url, is_verified, is_trusted, is_active, is_testing)
        `)
        .eq('is_active', true)
        .eq('stores.is_active', true)
        .in('stores.slug', FEATURED_STORE_SLUGS)
        .or(`release_at.is.null,release_at.lte.${now}`)
        .limit(20);

      if (error) throw error;
      
      const products = data as unknown as FeaturedProduct[];
      
      // Shuffle products randomly for variety
      const shuffled = products
        .map(p => ({ ...p, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .slice(0, 6);
      
      return shuffled;
    },
    staleTime: 1000 * 60 * 2, // 2 min cache
  });
}

function ProductCard({ product }: { product: FeaturedProduct }) {
  const { formatPrice } = useCurrency();
  
  return (
    <Link 
      to={`/products/${product.slug}`}
      className="block rounded-xl overflow-hidden bg-card border border-border hover:border-primary/30 transition-all active:scale-[0.98]"
    >
      {/* Image */}
      <div className="aspect-[4/3] relative overflow-hidden bg-muted">
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
            No image
          </div>
        )}
        
        {/* Store badge overlay */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2">
          <div className="flex items-center gap-1.5">
            {product.stores?.logo_url && (
              <img 
                src={product.stores.logo_url} 
                alt=""
                className="h-5 w-5 rounded object-cover bg-white/10"
              />
            )}
            <span className="text-white text-xs truncate">{product.stores?.name}</span>
            {product.stores?.is_verified && (
              <ShieldCheck className="h-3 w-3 text-blue-400 flex-shrink-0" />
            )}
            {product.stores?.is_trusted && (
              <Award className="h-3 w-3 text-amber-400 flex-shrink-0" />
            )}
          </div>
        </div>
      </div>
      
      {/* Info */}
      <div className="p-3">
        <h4 className="font-medium text-sm text-foreground line-clamp-1 mb-1">
          {product.name}
        </h4>
        <div className="flex items-center justify-between">
          <span className="text-primary font-bold text-sm">
            {formatPrice(product.price)}
          </span>
          {product.average_rating && (
            <span className="text-xs text-muted-foreground">
              ⭐ {product.average_rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function ProductSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden bg-card border border-border">
      <Skeleton className="aspect-[4/3]" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  );
}

export function PWAFeaturedProducts() {
  const { data: products, isLoading } = useAlgorithmicProducts();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Featured Products</h3>
        <Link 
          to="/products" 
          className="text-xs text-primary hover:underline flex items-center gap-0.5"
        >
          View all
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <ProductSkeleton key={i} />
          ))
        ) : products?.length ? (
          products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))
        ) : (
          <p className="col-span-2 text-sm text-muted-foreground text-center py-4">
            No products available
          </p>
        )}
      </div>
    </div>
  );
}
