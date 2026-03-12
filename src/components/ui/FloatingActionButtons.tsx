import { useState, useEffect, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';
import { cn } from '@/lib/utils';

export const FloatingActionButtons = forwardRef<HTMLDivElement>(function FloatingActionButtons(_props, ref) {
  const navigate = useNavigate();
  const { items } = useCart();
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
    <div
      ref={ref}
      className={cn(
        "fixed z-50 flex flex-col gap-2 xs:gap-3 transition-all duration-300",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5 pointer-events-none"
      )}
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.75rem)',
        right: 'max(1.5rem, env(safe-area-inset-right, 0px) + 1rem)',
      }}
    >
      {/* Scroll to top */}
      <div className={cn(
        "transition-all duration-200",
        showScrollTop ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"
      )}>
        <Button
          size="icon"
          onClick={scrollToTop}
          className="h-10 w-10 xs:h-12 xs:w-12 rounded-full shadow-lg bg-secondary hover:bg-secondary/90 text-secondary-foreground border-0 touch-target"
        >
          <ArrowUp className="h-4 w-4 xs:h-5 xs:w-5" />
        </Button>
      </div>

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
          <span className="absolute -top-0.5 -right-0.5 xs:-top-1 xs:-right-1 h-5 w-5 xs:h-6 xs:w-6 rounded-full bg-destructive text-destructive-foreground text-[10px] xs:text-xs font-bold flex items-center justify-center shadow-md animate-in zoom-in-75 duration-200">
            {cartItemCount > 9 ? '9+' : cartItemCount}
          </span>
        )}
      </div>
    </div>
  );
});
