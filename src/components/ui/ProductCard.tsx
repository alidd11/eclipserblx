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

// Region flag images
import ukFlag from '@/assets/regions/uk-flag.jpg';
import usFlag from '@/assets/regions/us-flag.jpg';
import euFlag from '@/assets/regions/eu-flag.jpg';
import beFlag from '@/assets/regions/be-flag.png';

// Helper to get region flag from category name and/or product name
const getRegionFlag = (category?: string, productName?: string): { src: string; name: string } | null => {
  const categoryLower = category?.toLowerCase() || '';
  const nameLower = productName?.toLowerCase() || '';
  
  // Check for specific products first
  if (nameLower.includes('ypres') || nameLower.includes('belgium')) {
    return { src: beFlag, name: 'Belgium' };
  }
  
  // Buildings category defaults to UK
  if (categoryLower === 'buildings' || categoryLower.includes('buildings')) {
    return { src: ukFlag, name: 'UK' };
  }
  
  // Bundle Deals default to UK
  if (categoryLower === 'bundle deals' || categoryLower.includes('bundle')) {
    return { src: ukFlag, name: 'UK' };
  }
  
  // Standard region checks
  if (categoryLower.startsWith('uk ') || categoryLower.includes(' uk')) {
    return { src: ukFlag, name: 'UK' };
  } else if (categoryLower.startsWith('us ') || categoryLower.includes(' us')) {
    return { src: usFlag, name: 'US' };
  } else if (categoryLower.startsWith('eu ') || categoryLower.includes(' eu')) {
    return { src: euFlag, name: 'EU' };
  }
  
  return null;
};

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
  showBestSellerBadge?: boolean;
  showNewBadge?: boolean;
}

export const ProductCard = memo(forwardRef<HTMLAnchorElement, ProductCardProps>(function ProductCard({ id, name, slug, price, image, images, category, categorySlug, categoryId, isFeatured, createdAt, storeName, storeSlug, storeLogo, isVerified, isTrusted, isResellable, showBestSellerBadge, showNewBadge }, ref) {
  const { addItem, isInCart } = useCart();
  const { isSubscribed, isEligibleForDiscount, getMemberPrice, getDiscountPercent } = useSubscription();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const inCart = isInCart(id);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Get the first media prioritizing video
  const displayMedia = getFirstMediaPrioritizeVideo(images) || image;
  const isVideo = isVideoUrl(displayMedia);
  
  // Check if product is new (within last 7 days for stores, 3 days elsewhere)
  const isNew = showNewBadge !== undefined 
    ? showNewBadge 
    : createdAt ? (Date.now() - new Date(createdAt).getTime()) < 3 * 24 * 60 * 60 * 1000 : false;
  
  // Always show member price for eligible products (not resellable)
  const isEligible = isEligibleForDiscount(categoryId, isResellable);
  const memberPrice = getMemberPrice(price, categoryId, isResellable);
  const discountPercent = getDiscountPercent(categoryId, isResellable);
  const hasMemberDiscount = isEligible && memberPrice < price;

  const handleAddToCart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!inCart) {
      addItem({
        id,
        name,
        price,
        image: displayMedia || undefined,
        slug,
        category_slug: categorySlug,
        category_id: categoryId,
        is_resellable: isResellable,
      });
    }
  }, [inCart, addItem, id, name, price, displayMedia, slug, categorySlug, categoryId, isResellable]);

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
        "overflow-hidden h-full flex flex-col rounded-lg border border-border bg-card transition-all duration-300",
        "hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 hover:border-primary/30",
        "group-hover:ring-1 group-hover:ring-primary/20",
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
            {showBestSellerBadge && (
              <div className="px-1.5 py-0.5 text-[10px] font-medium bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded shadow-sm">
                Best Seller
              </div>
            )}
            {isFeatured && !showBestSellerBadge && (
              <div className="px-1.5 py-0.5 text-[10px] font-medium bg-primary text-primary-foreground rounded">
                Featured
              </div>
            )}
            {isNew && !isFeatured && !showBestSellerBadge && (
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

        {/* Content with flag background */}
        <div className="relative p-2 xs:p-2.5 sm:p-3 flex flex-col flex-1 gap-1 xs:gap-1.5 overflow-hidden">
          {/* Flag background overlay (centered, fades out before the CTA) */}
          {(() => {
            const regionFlag = getRegionFlag(category, name);
            if (!regionFlag) return null;
            return (
              <div
                className="absolute inset-0 bottom-14 xs:bottom-16 pointer-events-none overflow-hidden flex items-center justify-center"
                style={{
                  WebkitMaskImage:
                    'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
                  maskImage:
                    'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
                }}
              >
                <img
                  src={regionFlag.src}
                  alt=""
                  className="h-[80%] w-auto opacity-[0.08] object-cover"
                />
              </div>
            );
          })()}
          
          {/* Content layer */}
          {category && (
            <span className="text-[9px] xs:text-[10px] sm:text-xs font-medium text-primary uppercase tracking-wider truncate relative z-10">
              {category}
            </span>
          )}
          
          {/* Store info with logo and badges */}
          {storeName && (
            <div className="flex items-center gap-1 xs:gap-1.5 text-[9px] xs:text-[10px] text-muted-foreground">
              {/* Store Logo */}
              {storeLogo ? (
                <img 
                  src={storeLogo} 
                  alt={storeName}
                  className="h-3.5 w-3.5 xs:h-4 xs:w-4 rounded object-contain bg-background flex-shrink-0"
                />
              ) : (
                <div className="h-3.5 w-3.5 xs:h-4 xs:w-4 rounded bg-muted flex items-center justify-center flex-shrink-0">
                  <Store className="h-2 w-2 xs:h-2.5 xs:w-2.5 text-muted-foreground" />
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
                <BadgeCheck className="h-2.5 w-2.5 xs:h-3 xs:w-3 text-blue-500 flex-shrink-0" />
              )}
              {isTrusted && (
                <Shield className="h-2.5 w-2.5 xs:h-3 xs:w-3 text-amber-500 flex-shrink-0" />
              )}
            </div>
          )}
          
          <h3 className="font-display font-semibold text-[11px] xs:text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-tight flex-1">
            {name}
          </h3>

          {/* Price section - show both prices only if eligible for discount */}
          <div className="flex flex-col gap-0.5 mt-auto pt-1">
            {hasMemberDiscount ? (
              <>
                {/* Normal price */}
                <span className="text-[9px] xs:text-[10px] text-muted-foreground leading-none line-through">
                  {formatPrice(price)}
                </span>
                {/* Member price + discount badge */}
                <div className="flex items-center gap-1">
                  <span className="text-xs xs:text-sm font-bold whitespace-nowrap leading-none text-amber-400">
                    {formatPrice(memberPrice)}
                  </span>
                  <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[7px] xs:text-[8px] font-medium leading-none bg-amber-500/20 text-amber-400">
                    <Sparkles className="h-1.5 w-1.5 xs:h-2 xs:w-2 flex-shrink-0" />
                    {discountPercent}%
                  </span>
                </div>
              </>
            ) : (
              /* Single price for Eclipse Savers or non-discountable products */
              <span className="text-xs xs:text-sm font-bold whitespace-nowrap leading-none text-foreground">
                {formatPrice(price)}
              </span>
            )}
          </div>

          {/* Add to cart button - separate row */}
          <Button
            size="sm"
            variant={inCart ? "secondary" : "default"}
            className={cn(
              "h-7 xs:h-8 w-full text-[10px] xs:text-xs mt-1.5 xs:mt-2 touch-target",
              !inCart && "gradient-button border-0"
            )}
            onClick={handleAddToCart}
          >
            {inCart ? (
              <>
                <Check className="h-3 w-3 xs:h-3.5 xs:w-3.5 mr-1" />
                <span className="hidden xs:inline">Added to Cart</span>
                <span className="xs:hidden">Added</span>
              </>
            ) : (
              <>
                <ShoppingCart className="h-3 w-3 xs:h-3.5 xs:w-3.5 mr-1" />
                <span className="hidden xs:inline">Add to Cart</span>
                <span className="xs:hidden">Add</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </Link>
  );
}));

ProductCard.displayName = 'ProductCard';
