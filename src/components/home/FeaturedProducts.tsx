import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/ui/ProductCard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export const FeaturedProducts = memo(function FeaturedProducts() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const minSwipeDistance = 50;

  const { data: products, isLoading } = useQuery({
    queryKey: ['featured-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories (name, slug)
        `)
        .eq('is_featured', true)
        .eq('is_active', true)
        .or(`release_at.is.null,release_at.lte.${new Date().toISOString()}`)
        .limit(8);
      
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
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

  // Auto-rotate every 5 seconds
  useEffect(() => {
    if (!isAutoPlaying || !products || products.length <= 1) return;

    const interval = setInterval(goToNext, 5000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, products, goToNext]);

  // Pause auto-play on hover
  const handleMouseEnter = () => setIsAutoPlaying(false);
  const handleMouseLeave = () => setIsAutoPlaying(true);

  // Touch handlers for swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
    setIsAutoPlaying(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) {
      setIsAutoPlaying(true);
      return;
    }

    const distance = touchStartX.current - touchEndX.current;
    const isSwipe = Math.abs(distance) > minSwipeDistance;

    if (isSwipe) {
      if (distance > 0) {
        // Swiped left - go to next
        goToNext();
      } else {
        // Swiped right - go to prev
        goToPrev();
      }
    }

    touchStartX.current = null;
    touchEndX.current = null;
    setIsAutoPlaying(true);
  };

  const currentProduct = products?.[currentIndex];

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-2">
              Featured Products
            </h2>
            <p className="text-muted-foreground">
              Hand-picked assets loved by the community
            </p>
          </div>
          <Link to="/products?featured=true" className="hidden sm:block">
            <Button variant="outline">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="max-w-md mx-auto">
            <div className="gaming-card overflow-hidden">
              <Skeleton className="aspect-[4/3]" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-full" />
                <div className="flex justify-between">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-9 w-20" />
                </div>
              </div>
            </div>
          </div>
        ) : products && products.length > 0 ? (
          <div 
            className="relative max-w-md mx-auto"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {/* Navigation Arrows */}
            {products.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full mr-4 z-10 hidden md:flex bg-background/80 backdrop-blur-sm"
                  onClick={goToPrev}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full ml-4 z-10 hidden md:flex bg-background/80 backdrop-blur-sm"
                  onClick={goToNext}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </>
            )}

            {/* Product Card with Animation */}
            <div 
              className="overflow-hidden touch-pan-y"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div 
                className="transition-transform duration-500 ease-out"
                key={currentIndex}
              >
                {currentProduct && (
                  <div className="animate-fade-in">
                    <ProductCard
                      id={currentProduct.id}
                      name={currentProduct.name}
                      slug={currentProduct.slug}
                      price={Number(currentProduct.price)}
                      image={currentProduct.images?.[0]}
                      images={currentProduct.images}
                      category={currentProduct.categories?.name}
                      categorySlug={currentProduct.categories?.slug}
                      categoryId={currentProduct.category_id}
                      isFeatured={currentProduct.is_featured}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Navigation Arrows */}
            {products.length > 1 && (
              <div className="flex justify-center gap-4 mt-4 md:hidden">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToPrev}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToNext}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            )}

            {/* Dot Indicators */}
            {products.length > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                {products.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all duration-300",
                      idx === currentIndex 
                        ? "bg-primary w-6" 
                        : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    )}
                    aria-label={`Go to product ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>No featured products yet. Check back soon!</p>
          </div>
        )}

        <div className="mt-8 text-center sm:hidden">
          <Link to="/products?featured=true">
            <Button variant="outline">
              View All Featured
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
});
