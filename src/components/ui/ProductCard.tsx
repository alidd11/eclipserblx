import { memo, useCallback, useRef, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { ShoppingCart, Check, Sparkles, BadgeCheck, Shield, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';
import { useSubscription } from '@/hooks/useSubscription';
import { useCurrency } from '@/hooks/useCurrency';
import { cn } from '@/lib/utils';
import { getFirstMediaPrioritizeVideo, isVideoUrl } from '@/lib/mediaUtils';
import { WishlistButton } from '@/components/wishlist/WishlistButton';

interface ProductCardProps {
  id: string;
  name: string;
  slug: string;
  price: number;
  image?: string;
  images?: string[];
  category?: string;
  categorySlug?: string;
  categoryId?: string;
  isFeatured?: boolean;
  createdAt?: string;
  storeName?: string;
  storeSlug?: string;
  storeLogo?: string | null;
  isVerified?: boolean;
  isTrusted?: boolean;
  isResellable?: boolean;
}

export const ProductCard = memo(forwardRef<HTMLAnchorElement, ProductCardProps>(function ProductCard({ id, name, slug, price, image, images, category, categorySlug, categoryId, isFeatured, createdAt, storeName, storeSlug, storeLogo, isVerified, isTrusted, isResellable }, ref) {
  const { addItem, isInCart } = useCart();
  const { isSubscribed, isEligibleForDiscount, getMemberPrice, getDiscountPercent } = useSubscription();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const inCart = isInCart(id);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Get the first media prioritizing video
  const displayMedia = getFirstMediaPrioritizeVideo(images) || image;
  const isVideo = isVideoUrl(displayMedia);
  
  // Check if product is new (within last 3 days)
  const isNew = createdAt ? (Date.now() - new Date(createdAt).getTime()) < 3 * 24 * 60 * 60 * 1000 : false;
  
  // Always show member price for eligible products (not resellable)
  const isEligible = isEligibleForDiscount(categoryId, isResellable);
  const memberPrice = getMemberPrice(price, categoryId, isResellable);
  const discountPercent = getDiscountPercent(categoryId, isResellable);
  const hasMemberDiscount = isEligible && memberPrice < price;

  const handleAddToCart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!inCart) {
      addItem({ id, name, price, image: displayMedia || undefined, slug, category_slug: categorySlug, category_id: categoryId });
    }
  }, [inCart, addItem, id, name, price, displayMedia, slug, categorySlug, categoryId]);

  const handleMouseEnter = useCallback(() => {
    if (videoRef.current && isVideo) {
      videoRef.current.play().catch(() => {});
    }
  }, [isVideo]);

  const handleMouseLeave = useCallback(() => {
    if (videoRef.current && isVideo) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [isVideo]);

  return (
    <Link 
      ref={ref}
      to={`/products/${slug}`} 
      className="group block h-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={cn(
        "gaming-card-hover overflow-hidden h-full flex flex-col",
        isFeatured && "ring-1 ring-primary/50"
      )}>
        {/* Image/Video */}
        <div className="relative aspect-[4/3] bg-black/20 overflow-hidden flex-shrink-0">
          {displayMedia ? (
            isVideo ? (
              <video
                ref={videoRef}
                src={displayMedia}
                muted
                loop
                playsInline
                autoPlay
                className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <img
                src={displayMedia}
                alt={name}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
              />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-background">
              <span className="text-2xl font-display font-bold text-muted-foreground/30">
                {name.charAt(0)}
              </span>
            </div>
          )}
          
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
          
          {/* Wishlist button */}
          <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <WishlistButton productId={id} variant="icon" />
          </div>
        </div>

        {/* Content */}
        <div className="p-2.5 flex flex-col flex-1 gap-1.5">
          {category && (
            <span className="text-[10px] font-medium text-primary uppercase tracking-wider truncate">
              {category}
            </span>
          )}
          
          {/* Store info with logo and badges */}
          {storeName && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              {/* Store Logo */}
              {storeLogo ? (
                <img 
                  src={storeLogo} 
                  alt={storeName}
                  className="h-4 w-4 rounded object-contain bg-background flex-shrink-0"
                />
              ) : (
                <div className="h-4 w-4 rounded bg-muted flex items-center justify-center flex-shrink-0">
                  <Store className="h-2.5 w-2.5 text-muted-foreground" />
                </div>
              )}
              <span className="truncate">
                {storeSlug ? (
                  <span 
                    role="link"
                    tabIndex={0}
                    className="hover:text-primary transition-colors cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate(`/store/${storeSlug}`);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate(`/store/${storeSlug}`);
                      }
                    }}
                  >
                    {storeName}
                  </span>
                ) : (
                  storeName
                )}
              </span>
              {isVerified && (
                <BadgeCheck className="h-3 w-3 text-blue-500 flex-shrink-0" />
              )}
              {isTrusted && (
                <Shield className="h-3 w-3 text-amber-500 flex-shrink-0" />
              )}
            </div>
          )}
          
          <h3 className="font-display font-semibold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-tight flex-1">
            {name}
          </h3>

          {/* Price section - show both prices only if eligible for discount */}
          <div className="flex flex-col gap-0.5 mt-auto pt-1">
            {hasMemberDiscount ? (
              <>
                {/* Normal price */}
                <span className="text-[10px] text-muted-foreground leading-none line-through">
                  {formatPrice(price)}
                </span>
                {/* Member price + discount badge */}
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold whitespace-nowrap leading-none text-amber-400">
                    {formatPrice(memberPrice)}
                  </span>
                  <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-medium leading-none bg-amber-500/20 text-amber-400">
                    <Sparkles className="h-2 w-2 flex-shrink-0" />
                    {discountPercent}%
                  </span>
                </div>
              </>
            ) : (
              /* Single price for Eclipse Savers or non-discountable products */
              <span className="text-sm font-bold whitespace-nowrap leading-none text-foreground">
                {formatPrice(price)}
              </span>
            )}
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
}));

ProductCard.displayName = 'ProductCard';
