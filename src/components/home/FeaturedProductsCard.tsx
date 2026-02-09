import { memo, useState, useEffect, useCallback, useRef, useMemo, forwardRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, ChevronLeft, ChevronRight, ArrowRight, ShoppingBag, Crown, BadgeCheck, Shield, Store } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { BackgroundVideo } from '@/components/ui/BackgroundVideo';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/hooks/useSubscription';
import { getFirstMediaPrioritizeVideo, isVideoUrl } from '@/lib/mediaUtils';
import { useCurrency } from '@/hooks/useCurrency';
import { useIsMobile } from '@/hooks/use-mobile';

// Region flag images
import ukFlag from '@/assets/regions/uk-flag.jpg';
import usFlag from '@/assets/regions/us-flag.jpg';
import euFlag from '@/assets/regions/eu-flag.jpg';
import beFlag from '@/assets/regions/be-flag.png';

// Helper to get region flag from category name and/or product name
const getRegionFlag = (category?: string, productName?: string): { src: string; name: string } | null => {
  const categoryLower = category?.toLowerCase() || '';
  const nameLower = productName?.toLowerCase() || '';
  
  // Check for specific products first
  if (nameLower.includes('ypres') || nameLower.includes('belgium')) {
    return { src: beFlag, name: 'Belgium' };
  }
  
  // Buildings category defaults to UK
  if (categoryLower === 'buildings' || categoryLower.includes('buildings')) {
    return { src: ukFlag, name: 'UK' };
  }
  
  // Bundle Deals default to UK
  if (categoryLower === 'bundle deals' || categoryLower.includes('bundle')) {
    return { src: ukFlag, name: 'UK' };
  }
  
  // Standard region checks
  if (categoryLower.startsWith('uk ') || categoryLower.includes(' uk')) {
    return { src: ukFlag, name: 'UK' };
  } else if (categoryLower.startsWith('us ') || categoryLower.includes(' us')) {
    return { src: usFlag, name: 'US' };
  } else if (categoryLower.startsWith('eu ') || categoryLower.includes(' eu')) {
    return { src: euFlag, name: 'EU' };
  }
  
  return null;
};

const ITEMS_PER_PAGE_DESKTOP = 3;
const ITEMS_PER_PAGE_MOBILE = 2;
const ROTATION_INTERVAL = 6000; // 6 seconds

interface FeaturedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[] | null;
  is_featured: boolean;
  is_resellable: boolean;
  category_id: string | null;
  categories: { name: string } | null;
  stores: { 
    name: string;
    slug: string;
    logo_url: string | null;
    is_verified: boolean;
    is_trusted: boolean;
    is_active: boolean;
  } | null;
}

export const FeaturedProductsCard = memo(function FeaturedProductsCard() {
  const [pageIndex, setPageIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const { getMemberPrice, getDiscountPercent, isEligibleForDiscount } = useSubscription();
  const { formatPrice } = useCurrency();
  const isMobile = useIsMobile();

  const itemsPerPage = isMobile ? ITEMS_PER_PAGE_MOBILE : ITEMS_PER_PAGE_DESKTOP;

  const { data: products, isLoading } = useQuery({
    queryKey: ['featured-products-card'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`*, categories (name), stores (name, slug, logo_url, is_verified, is_trusted, is_active), is_resellable`)
        .eq('is_featured', true)
        .eq('is_active', true)
        .or(`release_at.is.null,release_at.lte.${new Date().toISOString()}`)
        .limit(12);
      
      if (error) throw error;
      return (data?.filter(p => p.stores?.is_active === true) ?? []) as FeaturedProduct[];
    },
    staleTime: 1000 * 60 * 5,
  });

  const totalPages = useMemo(() => {
    if (!products || products.length === 0) return 0;
    return Math.ceil(products.length / itemsPerPage);
  }, [products, itemsPerPage]);

  const currentProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    const startIndex = pageIndex * itemsPerPage;
    return products.slice(startIndex, startIndex + itemsPerPage);
  }, [products, pageIndex, itemsPerPage]);

  const goToNext = useCallback(() => {
    if (totalPages > 1) {
      setPageIndex((prev) => (prev + 1) % totalPages);
    }
  }, [totalPages]);

  const goToPrev = useCallback(() => {
    if (totalPages > 1) {
      setPageIndex((prev) => (prev - 1 + totalPages) % totalPages);
    }
  }, [totalPages]);

  // Auto-rotate every 6 seconds
  useEffect(() => {
    if (!isAutoPlaying || totalPages <= 1) return;
    const interval = setInterval(goToNext, ROTATION_INTERVAL);
    return () => clearInterval(interval);
  }, [isAutoPlaying, totalPages, goToNext]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsAutoPlaying(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current && touchEndX.current) {
      const distance = touchStartX.current - touchEndX.current;
      if (Math.abs(distance) > 50) {
        distance > 0 ? goToNext() : goToPrev();
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
    setIsAutoPlaying(true);
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className={cn(
          "grid gap-3",
          isMobile ? "grid-cols-2" : "grid-cols-3"
        )}>
          {Array.from({ length: isMobile ? 2 : 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Featured</span>
        </div>
        <div className="h-24 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No featured products yet</p>
        </div>
        <div className="mt-3 flex justify-end">
          <Link to="/products" className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
            Browse all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="rounded-2xl border border-border bg-card p-5 h-full"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Featured</span>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={goToPrev}
              className="w-6 h-6 rounded-md bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <button
              onClick={goToNext}
              className="w-6 h-6 rounded-md bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        )}
      </div>

      {/* Products Grid */}
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={pageIndex}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.35 }}
            className={cn(
              "grid gap-3",
              isMobile ? "grid-cols-2" : "grid-cols-3"
            )}
          >
            {currentProducts.map((product) => (
              <ProductGridItem
                key={product.id}
                product={product}
                formatPrice={formatPrice}
                getMemberPrice={getMemberPrice}
                getDiscountPercent={getDiscountPercent}
                isEligibleForDiscount={isEligibleForDiscount}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPageIndex(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === pageIndex
                  ? "w-4 bg-primary"
                  : "w-1.5 bg-muted hover:bg-muted-foreground/50"
              )}
              aria-label={`View page ${i + 1}`}
            />
          ))}
        </div>
        <Link 
          to="/featured" 
          className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
});

interface ProductGridItemProps {
  product: FeaturedProduct;
  formatPrice: (price: number) => string;
  getMemberPrice: (price: number, categoryId: string | null, isResellable: boolean) => number;
  getDiscountPercent: (categoryId: string | null, isResellable: boolean) => number;
  isEligibleForDiscount: (categoryId: string | null, isResellable: boolean) => boolean;
}

const ProductGridItem = memo(forwardRef<HTMLAnchorElement, ProductGridItemProps>(function ProductGridItem({
  product,
  formatPrice,
  getMemberPrice,
  getDiscountPercent,
  isEligibleForDiscount,
}, ref) {
  const navigate = useNavigate();
  const displayMedia = getFirstMediaPrioritizeVideo(product.images);
  const isVideo = isVideoUrl(displayMedia);
  const isEligible = isEligibleForDiscount(product.category_id, product.is_resellable);
  const memberPrice = getMemberPrice(product.price, product.category_id, product.is_resellable);
  const discountPercent = getDiscountPercent(product.category_id, product.is_resellable);
  const hasMemberDiscount = isEligible && memberPrice < product.price;

  return (
    <Link 
      ref={ref}
      to={`/products/${product.slug}`} 
      className="group rounded-xl border border-border bg-background/50 overflow-hidden hover:border-primary/50 transition-all duration-200"
    >
      {/* Media */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {displayMedia ? (
          isVideo ? (
            <BackgroundVideo
              src={displayMedia}
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
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <ShoppingBag className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        
        {/* HOT Badge */}
        {product.is_featured && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-amber-500 text-[10px] font-bold text-black">
            HOT
          </div>
        )}
      </div>

      {/* Content with flag background */}
      <div className="relative p-3 overflow-hidden">
        {/* Flag background overlay (full width, fades at bottom) */}
        {(() => {
          const regionFlag = getRegionFlag(product.categories?.name, product.name);
          if (!regionFlag) return null;
          return (
            <div
              className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center"
              style={{
                WebkitMaskImage:
                  'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
                maskImage:
                  'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
              }}
            >
              <img
                src={regionFlag.src}
                alt=""
                className="w-full h-[95%] opacity-[0.08] object-cover"
              />
            </div>
          );
        })()}
        
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider truncate mb-0.5 relative z-10">
          {product.categories?.name || 'Product'}
        </p>
        
        {/* Store info with logo and badges */}
        {product.stores && (
          <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground mb-1 relative z-10">
            {product.stores.logo_url ? (
              <img 
                src={product.stores.logo_url} 
                alt={product.stores.name}
                className="h-3.5 w-3.5 rounded object-contain bg-background flex-shrink-0"
              />
            ) : (
              <div className="h-3.5 w-3.5 rounded bg-muted flex items-center justify-center flex-shrink-0">
                <Store className="h-2 w-2 text-muted-foreground" />
              </div>
            )}
            <span 
              className="truncate hover:text-primary transition-colors cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate(`/store/${product.stores?.slug}`);
              }}
            >
              {product.stores.name}
            </span>
            {product.stores.is_verified && (
              <BadgeCheck className="h-2.5 w-2.5 text-blue-500 flex-shrink-0" />
            )}
            {product.stores.is_trusted && (
              <Shield className="h-2.5 w-2.5 text-amber-500 flex-shrink-0" />
            )}
          </div>
        )}
        
        <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors mb-2 relative z-10">
          {product.name}
        </h3>
        
        {/* Price */}
        <div className="flex items-center gap-2">
          {hasMemberDiscount ? (
            <>
              <span className="font-bold text-sm text-amber-500">
                {formatPrice(memberPrice)}
              </span>
              <span className="text-[10px] text-muted-foreground line-through">
                {formatPrice(Number(product.price))}
              </span>
              <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[9px] font-bold">
                <Crown className="h-2 w-2" />
                {discountPercent}%
              </span>
            </>
          ) : (
            <span className="font-bold text-sm">
              {formatPrice(Number(product.price))}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}));

ProductGridItem.displayName = 'ProductGridItem';
