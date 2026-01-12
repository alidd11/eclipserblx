import { memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  id: string;
  name: string;
  slug: string;
  price: number;
  image?: string;
  category?: string;
  categorySlug?: string;
  categoryId?: string;
  isFeatured?: boolean;
  createdAt?: string;
}

export const ProductCard = memo(function ProductCard({ id, name, slug, price, image, category, categorySlug, categoryId, isFeatured, createdAt }: ProductCardProps) {
  const { addItem, isInCart } = useCart();
  const { isSubscribed, isEligibleForDiscount, getMemberPrice, getDiscountPercent } = useSubscription();
  const inCart = isInCart(id);
  
  // Check if product is new (within last 3 days)
  const isNew = createdAt ? (Date.now() - new Date(createdAt).getTime()) < 3 * 24 * 60 * 60 * 1000 : false;
  
  // Always show member price for eligible products
  const isEligible = isEligibleForDiscount(categoryId);
  const memberPrice = getMemberPrice(price, categoryId);
  const discountPercent = getDiscountPercent(categoryId);
  const hasMemberDiscount = isEligible && memberPrice < price;

  const handleAddToCart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!inCart) {
      addItem({ id, name, price, image, slug, category_slug: categorySlug });
    }
  }, [inCart, addItem, id, name, price, image, slug, categorySlug]);

  return (
    <Link to={`/products/${slug}`} className="group block h-full">
      <div className={cn(
        "gaming-card-hover overflow-hidden h-full flex flex-col",
        isFeatured && "ring-1 ring-primary/50"
      )}>
        {/* Image */}
        <div className="relative aspect-[4/3] bg-muted overflow-hidden flex-shrink-0">
          {image ? (
            <img
              src={image}
              alt={name}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-background">
              <span className="text-2xl font-display font-bold text-muted-foreground/30">
                {name.charAt(0)}
              </span>
            </div>
          )}
          
          {/* Watermark overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="relative w-12 h-12 opacity-50">
              <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_4px_rgba(168,85,247,0.4)]">
                <circle 
                  cx="50" cy="50" r="45" 
                  fill="none" 
                  stroke="rgba(168,85,247,0.8)" 
                  strokeWidth="4"
                />
                <ellipse 
                  cx="50" cy="50" 
                  rx="28" ry="28" 
                  fill="none" 
                  stroke="rgba(168,85,247,0.6)" 
                  strokeWidth="3"
                />
              </svg>
            </div>
          </div>
          
          {/* Corner watermark */}
          <div className="absolute bottom-1.5 right-1.5 pointer-events-none">
            <span className="text-[8px] font-display font-bold text-white/70 tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              ECLIPSE
            </span>
          </div>
          
          {/* Badges */}
          <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
            {isFeatured && (
              <div className="px-1.5 py-0.5 text-[10px] font-medium bg-primary text-primary-foreground rounded">
                Featured
              </div>
            )}
            {isNew && !isFeatured && (
              <div className="px-1.5 py-0.5 text-[10px] font-medium bg-emerald-500 text-white rounded">
                New
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-2.5 flex flex-col flex-1 gap-1.5">
          {category && (
            <span className="text-[10px] font-medium text-primary uppercase tracking-wider truncate">
              {category}
            </span>
          )}
          
          <h3 className="font-display font-semibold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-tight flex-1">
            {name}
          </h3>

          {/* Price section - always show both prices */}
          <div className="flex flex-col gap-0.5 mt-auto pt-1">
            {/* Normal price */}
            <span className="text-[10px] text-muted-foreground leading-none">
              £{price.toFixed(2)}
            </span>
            {/* Member price + discount badge */}
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold whitespace-nowrap leading-none text-amber-400">
                £{memberPrice.toFixed(2)}
              </span>
              <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-medium leading-none bg-amber-500/20 text-amber-400">
                <Sparkles className="h-2 w-2 flex-shrink-0" />
                {discountPercent}%
              </span>
            </div>
          </div>

          {/* Add to cart button - separate row */}
          <Button
            size="sm"
            variant={inCart ? "secondary" : "default"}
            className={cn(
              "h-8 w-full text-xs mt-2",
              !inCart && "gradient-button border-0"
            )}
            onClick={handleAddToCart}
          >
            {inCart ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1" />
                Added to Cart
              </>
            ) : (
              <>
                <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                Add to Cart
              </>
            )}
          </Button>
        </div>
      </div>
    </Link>
  );
});
