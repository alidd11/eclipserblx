import { memo, useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ChevronLeft, ChevronRight, ArrowRight, ShoppingBag, Crown, Play } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/hooks/useSubscription';
import { getFirstMediaPrioritizeVideo, isVideoUrl } from '@/lib/mediaUtils';
import { useCurrency } from '@/hooks/useCurrency';

export const FeaturedProductsCard = memo(function FeaturedProductsCard() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const { getMemberPrice, getDiscountPercent, isEligibleForDiscount } = useSubscription();
  const { formatPrice } = useCurrency();

  const { data: products, isLoading } = useQuery({
    queryKey: ['featured-products-card'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`*, categories (name), stores (is_active), is_resellable`)
        .eq('is_featured', true)
        .eq('is_active', true)
        .or(`release_at.is.null,release_at.lte.${new Date().toISOString()}`)
        .limit(6);
      
      if (error) throw error;
      // Filter out products with inactive stores (but keep products without stores)
      return data?.filter(p => !p.stores || p.stores.is_active !== false) ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const goToNext = useCallback(() => {
    if (products && products.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % products.length);
    }
  }, [products]);

  const goToPrev = useCallback(() => {
    if (products && products.length > 0) {
      setCurrentIndex((prev) => (prev - 1 + products.length) % products.length);
    }
  }, [products]);

  useEffect(() => {
    if (!isAutoPlaying || !products || products.length <= 1) return;
    const interval = setInterval(goToNext, 4000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, products, goToNext]);

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

  const currentProduct = products?.[currentIndex];

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <Skeleton className="h-32 w-full rounded-xl" />
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
        {products.length > 1 && (
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

      {/* Product display */}
      <div className="h-24 relative overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          {currentProduct && (
            <motion.div
              key={currentProduct.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0"
            >
              <div className="h-full">
                <Link to={`/products/${currentProduct.slug}`} className="flex gap-3 h-full group">
                  <div className="relative w-24 h-full flex-shrink-0 rounded-xl overflow-hidden border border-border">
                    {(() => {
                      const displayMedia = getFirstMediaPrioritizeVideo(currentProduct.images);
                      const isVideo = isVideoUrl(displayMedia);
                      
                      if (displayMedia) {
                        if (isVideo) {
                          return (
                            <>
                              <video 
                                src={displayMedia} 
                                autoPlay
                                muted
                                loop
                                playsInline
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-6 h-6 rounded-full bg-black/50 flex items-center justify-center">
                                  <Play className="h-3 w-3 text-white ml-0.5" fill="white" />
                                </div>
                              </div>
                            </>
                          );
                        }
                        return (
                          <img 
                            src={displayMedia} 
                            alt={currentProduct.name}
                            className="w-full h-full object-cover"
                          />
                        );
                      }
                      return (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <ShoppingBag className="h-6 w-6 text-muted-foreground" />
                        </div>
                      );
                    })()}
                    {currentProduct.is_featured && (
                      <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-amber-500 text-[10px] font-bold text-black">
                        HOT
                      </div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-between py-0.5">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-0.5">
                        {currentProduct.categories?.name || 'Product'}
                      </p>
                      <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                        {currentProduct.name}
                      </h3>
                    </div>
                    <div className="flex items-center justify-between">
                      {(() => {
                        const isEligible = isEligibleForDiscount(currentProduct.category_id, currentProduct.is_resellable);
                        const memberPrice = getMemberPrice(currentProduct.price, currentProduct.category_id, currentProduct.is_resellable);
                        const discountPercent = getDiscountPercent(currentProduct.category_id, currentProduct.is_resellable);
                        const hasMemberDiscount = isEligible && memberPrice < currentProduct.price;
                        
                        return (
                          <div className="flex flex-col gap-0.5">
                            {hasMemberDiscount ? (
                              <>
                                <span className="text-xs text-muted-foreground line-through">
                                  {formatPrice(Number(currentProduct.price))}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-sm text-amber-500">
                                    {formatPrice(memberPrice)}
                                  </span>
                                  <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[9px] font-bold">
                                    <Crown className="h-2 w-2" />
                                    {discountPercent}%
                                  </span>
                                </div>
                              </>
                            ) : (
                              <span className="font-bold text-sm">
                                {formatPrice(Number(currentProduct.price))}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                      
                      <span className="text-xs text-muted-foreground flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        View <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1.5">
          {products.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === currentIndex
                  ? "w-4 bg-primary"
                  : "w-1.5 bg-muted hover:bg-muted-foreground/50"
              )}
              aria-label={`View product ${i + 1}`}
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
