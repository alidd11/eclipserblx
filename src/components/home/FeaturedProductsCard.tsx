import { memo, useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ChevronLeft, ChevronRight, ArrowRight, ShoppingBag, Crown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSubscription, BOT_CATEGORY_ID } from '@/hooks/useSubscription';

export const FeaturedProductsCard = memo(function FeaturedProductsCard() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const { isSubscribed, getMemberPrice, getDiscountPercent } = useSubscription();
  const { data: products, isLoading } = useQuery({
    queryKey: ['featured-products-card'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`*, categories (name)`)
        .eq('is_featured', true)
        .eq('is_active', true)
        .limit(6);
      
      if (error) throw error;
      return data;
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
      <div className="group relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 p-5">
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="group relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-card via-card to-violet-500/5 p-5 transition-all duration-500 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-violet-500/20 rounded-full blur-3xl opacity-30" />
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)' }} />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Sparkles className="h-4 w-4 text-violet-400" />
            </div>
            <span className="text-xs font-medium text-primary/80 uppercase tracking-wider">Featured</span>
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
      </div>
    );
  }

  return (
    <div 
      className="group relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-card via-card to-violet-500/5 p-5 transition-all duration-500 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background glow */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-violet-500/20 rounded-full blur-3xl opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Scanline effect */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)' }} />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Sparkles className="h-4 w-4 text-violet-400" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
            </div>
            <span className="text-xs font-medium text-primary/80 uppercase tracking-wider">Featured</span>
          </div>
          {products.length > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={goToPrev}
                className="w-6 h-6 rounded-md bg-muted/30 flex items-center justify-center hover:bg-muted/50 transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <button
                onClick={goToNext}
                className="w-6 h-6 rounded-md bg-muted/30 flex items-center justify-center hover:bg-muted/50 transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          )}
        </div>

        {/* Product display */}
        <div className="h-24 relative overflow-hidden">
          <AnimatePresence mode="wait">
            {currentProduct && (
              <motion.div
                key={currentProduct.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0"
              >
                <Link to={`/products/${currentProduct.slug}`} className="flex gap-3 h-full">
                  {/* Product image */}
                  <div className="relative w-24 h-full flex-shrink-0 rounded-xl overflow-hidden border border-white/10">
                    {currentProduct.images?.[0] ? (
                      <img 
                        src={currentProduct.images[0]} 
                        alt={currentProduct.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted/30 flex items-center justify-center">
                        <ShoppingBag className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                    )}
                    {currentProduct.is_featured && (
                      <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-amber-500/90 text-[10px] font-bold text-black">
                        HOT
                      </div>
                    )}
                  </div>
                  
                  {/* Product info */}
                  <div className="flex-1 flex flex-col justify-between py-0.5">
                    <div>
                      <p className="text-[10px] text-primary/70 font-medium uppercase tracking-wider mb-0.5">
                        {currentProduct.categories?.name || 'Product'}
                      </p>
                      <h3 className="font-display font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                        {currentProduct.name}
                      </h3>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-0.5">
                        {/* Normal price */}
                        <span className="text-xs text-muted-foreground">
                          £{Number(currentProduct.price).toFixed(2)}
                        </span>
                        {/* Member price */}
                        <div className="flex items-center gap-1.5">
                          <span className="font-display font-bold text-sm text-amber-500">
                            £{getMemberPrice(currentProduct.price, currentProduct.category_id).toFixed(2)}
                          </span>
                          <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-500/20 text-amber-500 text-[9px] font-bold">
                            <Crown className="h-2 w-2" />
                            {getDiscountPercent(currentProduct.category_id)}%
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        View <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Progress bar & dots */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1.5">
            {products.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === currentIndex
                    ? "w-4 bg-violet-400"
                    : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
                aria-label={`View product ${i + 1}`}
              />
            ))}
          </div>
          <Link 
            to="/products?featured=true" 
            className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
          >
            View all
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
});
