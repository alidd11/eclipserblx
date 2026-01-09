import { memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  id: string;
  name: string;
  slug: string;
  price: number;
  image?: string;
  category?: string;
  categorySlug?: string;
  isFeatured?: boolean;
}

export const ProductCard = memo(function ProductCard({ id, name, slug, price, image, category, categorySlug, isFeatured }: ProductCardProps) {
  const { addItem, isInCart } = useCart();
  const inCart = isInCart(id);

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
          
          {isFeatured && (
            <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[10px] font-medium bg-primary text-primary-foreground rounded">
              Featured
            </div>
          )}
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

          <div className="flex items-center justify-between gap-2 mt-auto pt-1">
            <span className="text-sm font-bold text-foreground whitespace-nowrap">
              £{price.toFixed(2)}
            </span>
            
            <Button
              size="sm"
              variant={inCart ? "secondary" : "default"}
              className={cn(
                "h-7 px-2 text-xs flex-shrink-0",
                !inCart && "gradient-button border-0"
              )}
              onClick={handleAddToCart}
            >
              {inCart ? (
                <>
                  <Check className="h-3 w-3 mr-0.5" />
                  <span className="hidden sm:inline">Added</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="h-3 w-3 mr-0.5" />
                  <span className="hidden sm:inline">Add</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
});
