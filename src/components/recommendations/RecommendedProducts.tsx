import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { useAIRecommendations } from '@/hooks/useAIRecommendations';
import { ProductCard } from '@/components/ui/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { SectionWrapper } from '@/components/home/SectionWrapper';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const ITEMS_PER_PAGE_DESKTOP = 6;
const ITEMS_PER_PAGE_MOBILE = 4;
const ROTATION_INTERVAL = 6000; // 6 seconds

interface RecommendedProductsProps {
  productId?: string;
  limit?: number;
  title?: string;
  className?: string;
}

export const RecommendedProducts = memo(function RecommendedProducts({
  productId,
  limit = 12,
  title = 'Trending Now',
  className = '',
}: RecommendedProductsProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const isMobile = useIsMobile();
  
  const { data, isLoading, error } = useAIRecommendations(productId, limit);

  const itemsPerPage = isMobile ? ITEMS_PER_PAGE_MOBILE : ITEMS_PER_PAGE_DESKTOP;

  const totalPages = useMemo(() => {
    if (!data?.recommendations?.length) return 0;
    return Math.ceil(data.recommendations.length / itemsPerPage);
  }, [data?.recommendations?.length, itemsPerPage]);

  const currentProducts = useMemo(() => {
    if (!data?.recommendations?.length) return [];
    const startIndex = pageIndex * itemsPerPage;
    return data.recommendations.slice(startIndex, startIndex + itemsPerPage);
  }, [data?.recommendations, pageIndex, itemsPerPage]);

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

  // Reset page index when items per page changes (mobile/desktop switch)
  useEffect(() => {
    setPageIndex(0);
  }, [itemsPerPage]);

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
      <SectionWrapper className={className}>
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold">{title}</h2>
              <p className="text-sm text-muted-foreground">Top picks this week</p>
            </div>
          </div>
          <div className={cn(
            "grid gap-3 sm:gap-4",
            isMobile 
              ? "grid-cols-2" 
              : "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
          )}>
            {Array.from({ length: isMobile ? 4 : 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
            ))}
          </div>
        </div>
      </SectionWrapper>
    );
  }

  if (error || !data?.recommendations?.length) {
    return null;
  }

  return (
    <SectionWrapper className={className}>
      <div 
        className="rounded-2xl border border-border bg-card p-6 md:p-8"
        onMouseEnter={() => setIsAutoPlaying(false)}
        onMouseLeave={() => setIsAutoPlaying(true)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold">{title}</h2>
              <p className="text-sm text-muted-foreground">Top picks this week</p>
            </div>
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrev}
                className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
              >
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              <button
                onClick={goToNext}
                className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          )}
        </div>

        {/* Products Grid with Animation */}
        <div className="relative overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pageIndex}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.4 }}
              className={cn(
                "grid gap-3 sm:gap-4",
                isMobile 
                  ? "grid-cols-2" 
                  : "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
              )}
            >
              {currentProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  price={product.price}
                  image={product.images?.[0] || '/placeholder.svg'}
                  slug={product.slug}
                  category={product.categories?.name}
                  storeName={product.stores?.name}
                  storeSlug={product.stores?.slug}
                  storeLogo={product.stores?.logo_url}
                  isVerified={product.stores?.is_verified}
                  isTrusted={product.stores?.is_trusted}
                  isResellable={(product as any).is_resellable}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress dots */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPageIndex(i)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  i === pageIndex
                    ? "w-6 bg-primary"
                    : "w-2 bg-muted hover:bg-muted-foreground/50"
                )}
                aria-label={`View page ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </SectionWrapper>
  );
});
