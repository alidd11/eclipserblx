import { X, ArrowRight, Scale } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useProductComparison } from '@/hooks/useProductComparison';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Floating comparison bar shown when user has products to compare.
 * Shows at bottom of screen on product listing pages.
 */
export function ComparisonBar() {
  const { compareProducts, removeFromCompare, clearComparison, compareCount } = useProductComparison();

  if (compareCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-xl shadow-lg p-3 w-[calc(100%-2rem)] max-w-lg"
      >
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 flex items-center gap-2 overflow-x-auto">
            {compareProducts.map(product => (
              <div key={product.id} className="flex items-center gap-1.5 bg-muted rounded-lg px-2 py-1 shrink-0">
                {product.image && (
                  <img src={product.image} alt="" className="w-6 h-6 rounded object-cover" />
                )}
                <span className="text-xs font-medium max-w-[80px] truncate">{product.name}</span>
                <button
                  onClick={() => removeFromCompare(product.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button variant="ghost" size="sm" onClick={clearComparison} className="text-xs h-7 px-2">
              Clear
            </Button>
            {compareCount >= 2 && (
              <Button asChild size="sm" className="gradient-button border-0 h-7 px-3 text-xs">
                <Link to={`/compare?ids=${compareProducts.map(p => p.id).join(',')}`}>
                  Compare
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
