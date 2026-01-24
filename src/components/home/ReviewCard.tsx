import { memo, useState, useEffect, useRef } from 'react';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

interface Review {
  id: string;
  rating: number;
  title: string | null;
  content: string;
  display_name: string;
  external_source: string | null;
}

const SWIPE_THRESHOLD = 50;

export const ReviewCard = memo(function ReviewCard() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const { data: reviews } = useQuery({
    queryKey: ['hero-reviews'],
    queryFn: async () => {
      const { data: reviewsData, error } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          title,
          content,
          user_id,
          is_external,
          external_reviewer_name,
          external_source
        `)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get profiles for non-external reviews
      const nonExternalUserIds = reviewsData
        ?.filter(r => !r.is_external && r.user_id)
        .map(r => r.user_id) || [];
      
      const { data: profiles } = nonExternalUserIds.length > 0
        ? await supabase
            .from('profiles')
            .select('user_id, display_name')
            .in('user_id', nonExternalUserIds)
        : { data: [] };

      const profileMap = new Map<string, string | null>(profiles?.map(p => [p.user_id, p.display_name] as [string, string | null]) || []);

      return reviewsData?.map((review) => {
        const displayName = review.is_external 
          ? (review.external_reviewer_name || 'Anonymous')
          : (profileMap.get(review.user_id) || 'Customer');
        
        return {
          id: review.id,
          rating: review.rating,
          title: review.title,
          content: review.content,
          display_name: displayName,
          external_source: review.is_external ? review.external_source : null,
        };
      }) as Review[];
    },
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (!reviews || reviews.length === 0) return;

    const interval = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % reviews.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [reviews]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!reviews || reviews.length === 0) return;
    
    const diff = touchStartX.current - touchEndX.current;
    
    if (Math.abs(diff) > SWIPE_THRESHOLD) {
      if (diff > 0) {
        setDirection(1);
        setCurrentIndex((prev) => (prev + 1) % reviews.length);
      } else {
        setDirection(-1);
        setCurrentIndex((prev) => (prev - 1 + reviews.length) % reviews.length);
      }
    }
    
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  const goNext = () => {
    if (!reviews) return;
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % reviews.length);
  };

  const goPrev = () => {
    if (!reviews) return;
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + reviews.length) % reviews.length);
  };

  if (!reviews || reviews.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 h-full">
        <div className="text-center text-muted-foreground py-8">
          No reviews yet
        </div>
      </div>
    );
  }

  const currentReview = reviews[currentIndex];

  return (
    <div 
      className="rounded-2xl border border-border bg-card p-5 h-full touch-pan-x relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Quote icon - subtle */}
      <Quote className="absolute top-4 right-4 h-10 w-10 text-muted/30" />
      
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Reviews</span>
          </div>
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-3 w-3 text-amber-500 fill-amber-500" />
            ))}
          </div>
        </div>

        {/* Review content */}
        <div className="h-24 relative overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentReview.id}
              initial={{ opacity: 0, x: direction >= 0 ? 30 : -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction >= 0 ? -30 : 30 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0"
            >
              <div className="flex items-center gap-0.5 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3.5 w-3.5 ${
                      i < currentReview.rating
                        ? 'text-amber-500 fill-amber-500'
                        : 'text-muted'
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-foreground line-clamp-2 leading-relaxed">
                "{currentReview.content}"
              </p>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                  {currentReview.display_name.charAt(0)}
                </div>
                <p className="text-xs font-medium text-foreground">
                  {currentReview.display_name}
                </p>
                {currentReview.external_source && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                    via {currentReview.external_source}
                  </span>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1">
            {reviews.slice(0, 6).map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setDirection(i > currentIndex % 6 ? 1 : -1);
                  setCurrentIndex(i);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentIndex % 6
                    ? 'bg-primary w-4'
                    : 'bg-muted w-1.5 hover:bg-muted-foreground/50'
                }`}
                aria-label={`Go to review ${i + 1}`}
              />
            ))}
            {reviews.length > 6 && (
              <span className="text-[10px] text-muted-foreground ml-1">+{reviews.length - 6}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={goPrev}
              className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button 
              onClick={goNext}
              className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
