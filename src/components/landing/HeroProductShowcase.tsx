import { Link } from 'react-router-dom';
import { Store, BadgeCheck, Shield, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';
import { getFirstMediaPrioritizeVideo, isVideoUrl } from '@/lib/mediaUtils';

interface HeroProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[] | null;
  stores: {
    name: string;
    slug: string;
    logo_url: string | null;
    is_verified: boolean;
    is_trusted: boolean;
  } | null;
}

function CompactProductCard({ product, index }: { product: HeroProduct; index: number }) {
  const { formatPrice } = useCurrency();
  const displayMedia = getFirstMediaPrioritizeVideo(product.images);
  const isVideo = isVideoUrl(displayMedia);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
    >
      <Link 
        to={`/products/${product.slug}`}
        className="group flex gap-3 p-2.5 rounded-lg bg-card/50 border border-border/50 hover:border-primary/30 hover:bg-card transition-all duration-300"
      >
        {/* Thumbnail */}
        <div className="relative w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
          {displayMedia ? (
            isVideo ? (
              <video
                src={displayMedia}
                muted
                loop
                playsInline
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <img
                src={displayMedia}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-xs text-muted-foreground">{product.name.charAt(0)}</span>
            </div>
          )}
          
          {/* Featured badge */}
          <div className="absolute top-0.5 left-0.5">
            <Badge className="px-1 py-0 text-[8px] bg-primary text-primary-foreground">
              FEATURED
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h4 className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {product.name}
          </h4>
          
          {/* Store info */}
          <div className="flex items-center gap-1 mt-0.5">
            {product.stores?.logo_url ? (
              <img 
                src={product.stores.logo_url} 
                alt={product.stores.name}
                className="h-3.5 w-3.5 rounded object-contain bg-white/10"
              />
            ) : (
              <Store className="h-3 w-3 text-muted-foreground" />
            )}
            <span className="text-[10px] text-muted-foreground truncate">
              {product.stores?.name}
            </span>
            {product.stores?.is_verified && (
              <BadgeCheck className="h-3 w-3 text-blue-400 flex-shrink-0" />
            )}
            {product.stores?.is_trusted && (
              <Shield className="h-3 w-3 text-amber-400 flex-shrink-0" />
            )}
          </div>

          {/* Price */}
          <span className="text-sm font-bold text-primary mt-0.5">
            {formatPrice(product.price)}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

function ProductSkeleton() {
  return (
    <div className="flex gap-3 p-2.5 rounded-lg bg-card/50 border border-border/50">
      <Skeleton className="w-16 h-16 rounded-md flex-shrink-0" />
      <div className="flex-1 flex flex-col justify-center gap-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  );
}

export function HeroProductShowcase() {
  const { data: products, isLoading } = useQuery({
    queryKey: ['hero-featured-products'],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, slug, price, images,
          stores!inner (name, slug, logo_url, is_verified, is_trusted, is_active, is_testing)
        `)
        .eq('is_active', true)
        .eq('is_featured', true)
        .eq('stores.is_active', true)
        .eq('stores.is_testing', false)
        .or(`release_at.is.null,release_at.lte.${now}`)
        .order('created_at', { ascending: false })
        .limit(4);

      if (error) throw error;
      return data as unknown as HeroProduct[];
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">Featured Products</span>
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <ProductSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!products?.length) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <div className="flex items-center justify-center gap-2 mb-4">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-muted-foreground">Featured Products</span>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        {products.slice(0, 3).map((product, index) => (
          <CompactProductCard key={product.id} product={product} index={index} />
        ))}
      </div>
    </motion.div>
  );
}
