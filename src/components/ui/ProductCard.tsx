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
  isFeatured?: boolean;
}

export function ProductCard({ id, name, slug, price, image, category, isFeatured }: ProductCardProps) {
  const { addItem, isInCart } = useCart();
  const inCart = isInCart(id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!inCart) {
      addItem({ id, name, price, image, slug });
    }
  };

  return (
    <Link to={`/products/${slug}`} className="group">
      <div className={cn(
        "gaming-card-hover overflow-hidden",
        isFeatured && "ring-1 ring-primary/50"
      )}>
        {/* Image */}
        <div className="relative aspect-video bg-muted overflow-hidden">
          {image ? (
            <img
              src={image}
              alt={name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-background">
              <span className="text-4xl font-display font-bold text-muted-foreground/30">
                {name.charAt(0)}
              </span>
            </div>
          )}
          
          {isFeatured && (
            <div className="absolute top-2 left-2 px-2 py-1 text-xs font-medium bg-primary text-primary-foreground rounded">
              Featured
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {category && (
            <span className="text-xs font-medium text-primary uppercase tracking-wider">
              {category}
            </span>
          )}
          
          <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
            {name}
          </h3>

          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-foreground">
              £{price.toFixed(2)}
            </span>
            
            <Button
              size="sm"
              variant={inCart ? "secondary" : "default"}
              className={cn(!inCart && "gradient-button border-0")}
              onClick={handleAddToCart}
            >
              {inCart ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Added
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4 mr-1" />
                  Add
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
}
