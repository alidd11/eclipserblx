import { forwardRef } from 'react';
import { ShoppingCart, X, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAbandonedCart } from '@/hooks/useAbandonedCart';
import { useCart } from '@/hooks/useCart';
import { motion, AnimatePresence } from 'framer-motion';

export const AbandonedCartBanner = forwardRef<HTMLDivElement>(function AbandonedCartBanner(_props, ref) {
  const { showRecoveryBanner, recoveryCart, dismissRecovery, markRecovered } = useAbandonedCart();
  const { addItem } = useCart();

  if (!showRecoveryBanner || !recoveryCart?.length) return null;

  const handleRestore = () => {
    recoveryCart.forEach((item) => addItem(item));
    markRecovered();
  };

  return (
    <AnimatePresence>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="relative bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4"
      >
        <button
          onClick={dismissRecovery}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <ShoppingCart className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              You left {recoveryCart.length} item{recoveryCart.length > 1 ? 's' : ''} in your cart
            </p>
            <p className="text-xs text-muted-foreground">
              Pick up where you left off — your items are still available!
            </p>
          </div>
          <Button size="sm" onClick={handleRestore} className="gradient-button border-0 shrink-0">
            Restore Cart
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});
