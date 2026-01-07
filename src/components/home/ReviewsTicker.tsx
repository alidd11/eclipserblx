import { memo, useState, useEffect, useRef, useCallback } from 'react';
import { Star } from 'lucide-react';
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

export const ReviewsTicker = memo(function ReviewsTicker() {
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

      // Fetch profiles separately
      const userIds = reviewsData?.map(r => r.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);

      return reviewsData?.map((review, index) => ({
        id: review.id,
        rating: review.rating,
        title: review.title,
        content: review.content,
        display_name: profileMap.get(review.user_id) || FAKE_NAMES[index % FAKE_NAMES.length],
      })) as Review[];
    },
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (!reviews || reviews.length === 0) return;

    const interval = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % reviews.length);
    }, 3000);

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
        // Swiped left - next review
        setDirection(1);
        setCurrentIndex((prev) => (prev + 1) % reviews.length);
      } else {
        // Swiped right - previous review
        setDirection(-1);
        setCurrentIndex((prev) => (prev - 1 + reviews.length) % reviews.length);
      }
    }
    
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  if (!reviews || reviews.length === 0) {
    return null;
  }

  const currentReview = reviews[currentIndex];

  return (
    <div className="pt-8 max-w-2xl mx-auto">
      <div 
        className="relative h-24 overflow-hidden touch-pan-x"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentReview.id}
            initial={{ opacity: 0, x: direction >= 0 ? 50 : -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction >= 0 ? -50 : 50 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 will-change-transform"
          >
            {/* Stars */}
            <div className="flex items-center gap-1 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < currentReview.rating
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-muted-foreground/30'
                  }`}
                />
              ))}
            </div>

            {/* Review Content */}
            <p className="text-sm text-muted-foreground line-clamp-2 italic">
              "{currentReview.content}"
            </p>

            {/* Author */}
            <p className="text-xs text-primary mt-1 font-medium">
              — {currentReview.display_name}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dot Indicators */}
      <div className="flex items-center justify-center gap-1 mt-2">
        {reviews.slice(0, 10).map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
              i === currentIndex % 10
                ? 'bg-primary w-3'
                : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
            }`}
            aria-label={`Go to review ${i + 1}`}
          />
        ))}
        {reviews.length > 10 && (
          <span className="text-xs text-muted-foreground ml-1">+{reviews.length - 10}</span>
        )}
      </div>
    </div>
  );
});
