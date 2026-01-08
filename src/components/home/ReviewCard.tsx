import { memo, useState, useEffect, useRef } from 'react';
import { Star, MessageSquare, Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

interface Review {
  id: string;
  rating: number;
  title: string | null;
  content: string;
  display_name: string;
}

const FAKE_NAMES = [
  'Alex M.', 'Jordan T.', 'Sam K.', 'Riley P.', 'Casey W.',
  'Morgan L.', 'Taylor S.', 'Jamie R.', 'Drew H.', 'Quinn B.',
  'Avery C.', 'Blake N.', 'Cameron D.', 'Dakota F.', 'Emery G.',
  'Finley J.', 'Harper V.', 'Hayden X.', 'Jesse Y.', 'Kendall Z.',
  'Logan A.', 'Mason E.', 'Noah I.', 'Oakley O.', 'Parker U.',
  'Peyton Q.', 'Reese S.', 'River T.', 'Rowan W.', 'Sage M.',
  'Sawyer K.', 'Skyler L.', 'Spencer N.', 'Sydney P.', 'Tatum R.',
];

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
          user_id
        `)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const userIds = reviewsData?.map(r => r.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);

      // Shuffle fake names deterministically based on review ID for consistency
      const shuffledNames = [...FAKE_NAMES].sort((a, b) => {
        const hash = (str: string) => str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return hash(a) - hash(b);
      });

      return reviewsData?.map((review) => {
        // Use review ID to pick a consistent random name
        const idHash = review.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const nameIndex = idHash % shuffledNames.length;
        
        return {
          id: review.id,
          rating: review.rating,
          title: review.title,
          content: review.content,
          display_name: shuffledNames[nameIndex],
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
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-card via-card to-blue-500/5 p-5">
        <div className="relative z-10 text-center text-muted-foreground py-8">
          No reviews yet
        </div>
      </div>
    );
  }

  const currentReview = reviews[currentIndex];

  return (
    <div 
      className="group relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-card via-card to-blue-500/5 p-5 transition-all duration-500 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10 touch-pan-x"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Animated background */}
      <div className="absolute -top-20 -left-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Quote decoration */}
      <div className="absolute top-3 right-3 opacity-10">
        <Quote className="h-16 w-16 text-primary" />
      </div>
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shadow-lg shadow-blue-500/30 border border-white/10">
                <MessageSquare className="h-4 w-4 text-blue-400" />
              </div>
            </div>
            <span className="text-xs font-medium text-primary/80 uppercase tracking-wider">Reviews</span>
          </div>
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className="h-3 w-3 text-amber-400 fill-amber-400"
              />
            ))}
          </div>
        </div>

        {/* Review content */}
        <div className="h-24 relative overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentReview.id}
              initial={{ opacity: 0, x: direction >= 0 ? 40 : -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction >= 0 ? -40 : 40 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="absolute inset-0 will-change-transform"
            >
              {/* Stars for this review */}
              <div className="flex items-center gap-0.5 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3.5 w-3.5 ${
                      i < currentReview.rating
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-muted-foreground/20'
                    }`}
                  />
                ))}
                <span className="ml-1.5 text-xs text-muted-foreground">{currentReview.rating}.0</span>
              </div>

              {/* Review text */}
              <p className="text-sm text-foreground/90 line-clamp-2 leading-relaxed">
                "{currentReview.content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-2 mt-2">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                  {currentReview.display_name.charAt(0)}
                </div>
                <p className="text-xs font-medium text-primary">
                  {currentReview.display_name}
                </p>
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
                    : 'bg-muted-foreground/30 w-1.5 hover:bg-muted-foreground/50'
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
              className="w-6 h-6 rounded-md bg-muted/30 flex items-center justify-center text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button 
              onClick={goNext}
              className="w-6 h-6 rounded-md bg-muted/30 flex items-center justify-center text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
