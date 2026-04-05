import { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface StickyBuyBarProps {
  productName: string;
  formattedPrice: string;
  inCart: boolean;
  onAddToCart: () => void;
  /** Ref to the main CTA button to observe */
  ctaRef: React.RefObject<HTMLElement | null>;
  disabled?: boolean;
}

export function StickyBuyBar({ productName, formattedPrice, inCart, onAddToCart, ctaRef, disabled }: StickyBuyBarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ctaRef]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed left-0 right-0 z-[55] md:hidden",
        "bg-background border-t border-border px-4 py-2",
        "animate-in slide-in-from-bottom-2 duration-200"
      )}
      style={{ bottom: 'var(--tab-bar-height, 0px)', paddingBottom: 'var(--bottom-safe-area, 0px)' }}
    >
      <div className="flex items-center gap-3 max-w-[1400px] mx-auto">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{productName}</p>
          <p className="text-xs text-muted-foreground">{formattedPrice}</p>
        </div>
        <Button
          size="sm"
          className={cn("shrink-0 h-9 px-4", !inCart && "gradient-button border-0")}
          variant={inCart ? "secondary" : "default"}
          onClick={onAddToCart}
          disabled={disabled}
        >
          {inCart ? (
            <>
              <Check className="h-4 w-4 mr-1.5" />
              Added
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4 mr-1.5" />
              Add to Cart
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
