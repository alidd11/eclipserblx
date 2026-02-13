import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, MessageCircle, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';
import { useChatPanel } from '@/hooks/useChatPanel';

export function FloatingActionButtons() {
  const navigate = useNavigate();
  const { items } = useCart();
  const { openChat } = useChatPanel();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setShowScrollTop(scrollY > 400);
      setIsVisible(scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cartItemCount = items.length;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-16 xs:bottom-20 right-3 xs:right-4 z-50 flex flex-col gap-2 xs:gap-3"
        >
          {/* Scroll to top */}
          <AnimatePresence>
            {showScrollTop && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Button
                  size="icon"
                  onClick={scrollToTop}
                  className="h-10 w-10 xs:h-12 xs:w-12 rounded-full shadow-lg bg-gradient-to-br from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white border-0 touch-target"
                >
                  <ArrowUp className="h-4 w-4 xs:h-5 xs:w-5" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Support chat */}
          <Button
            size="icon"
            onClick={() => openChat()}
            className="h-10 w-10 xs:h-12 xs:w-12 rounded-full shadow-lg bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground border-0 touch-target"
          >
            <MessageCircle className="h-4 w-4 xs:h-5 xs:w-5" />
          </Button>

          {/* Cart with badge */}
          <div className="relative">
            <Button
              size="icon"
              onClick={() => navigate('/cart')}
              className="h-12 w-12 xs:h-14 xs:w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground border-0 touch-target"
            >
              <ShoppingCart className="h-5 w-5 xs:h-6 xs:w-6" />
            </Button>
            {cartItemCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-0.5 -right-0.5 xs:-top-1 xs:-right-1 h-5 w-5 xs:h-6 xs:w-6 rounded-full bg-red-500 text-white text-[10px] xs:text-xs font-bold flex items-center justify-center shadow-md"
              >
                {cartItemCount > 9 ? '9+' : cartItemCount}
              </motion.span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
