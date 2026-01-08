import { memo, useState, useEffect, useRef } from 'react';
import { Star, MessageSquare } from 'lucide-react';
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
    }, 5000); // 5 seconds per review (different from stats)

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

  if (!reviews || reviews.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-blue-600/20 opacity-50" />
        <div className="relative z-10 text-center text-muted-foreground">
          No reviews yet
        </div>
      </div>
    );
  }

  const currentReview = reviews[currentIndex];

  return (
    <div 
      className="relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 touch-pan-x"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-blue-600/20 opacity-50" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-blue-400">
            <MessageSquare className="h-5 w-5" />
          </div>
          <span className="text-xs text-muted-foreground">Customer Reviews</span>
        </div>

        <div className="h-20 relative overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentReview.id}
              initial={{ opacity: 0, x: direction >= 0 ? 30 : -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction >= 0 ? -30 : 30 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="absolute inset-0 will-change-transform"
            >
              {/* Stars */}
              <div className="flex items-center gap-0.5 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3.5 w-3.5 ${
                      i < currentReview.rating
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>

              {/* Review Content */}
              <p className="text-sm text-muted-foreground line-clamp-2 italic mb-1">
                "{currentReview.content}"
              </p>

              {/* Author */}
              <p className="text-xs text-primary font-medium">
                — {currentReview.display_name}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dot Indicators */}
        <div className="flex items-center gap-1 mt-2">
          {reviews.slice(0, 8).map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setDirection(i > currentIndex % 8 ? 1 : -1);
                setCurrentIndex(i);
              }}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                i === currentIndex % 8
                  ? 'bg-primary w-3'
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
              aria-label={`Go to review ${i + 1}`}
            />
          ))}
          {reviews.length > 8 && (
            <span className="text-xs text-muted-foreground ml-1">+{reviews.length - 8}</span>
          )}
        </div>
      </div>
    </div>
  );
});
