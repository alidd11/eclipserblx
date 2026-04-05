import { memo, useCallback, useRef, forwardRef, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { ShoppingCart, Check, Sparkles, BadgeCheck, Shield, Store, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BackgroundVideo } from '@/components/ui/BackgroundVideo';
import { useCart } from '@/hooks/useCart';
import { useSubscription } from '@/hooks/useSubscription';
import { useCurrency } from '@/hooks/useCurrency';
import { cn } from '@/lib/utils';
import { getCardMediaChain, isVideoUrl } from '@/lib/mediaUtils';
import { WishlistButton } from '@/components/wishlist/WishlistButton';
import { usePrefetchProduct } from '@/hooks/usePrefetchProduct';
import quantisOverlay from '@/assets/quantis-product-overlay.png';
import { QUANTIS_STORE_ID } from '@/lib/constants';


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
  isResellable?: boolean;
  showBestSellerBadge?: boolean;
  showNewBadge?: boolean;
  averageRating?: number;
  storeEclipseEnabled?: boolean;
  isPayWhatYouWant?: boolean;
  minPrice?: number;
  /** When true, loads image eagerly with high fetch priority */
  priority?: boolean;
}

export const ProductCard = memo(forwardRef<HTMLAnchorElement, ProductCardProps>(function ProductCard({ id, name, slug, price, image, images, category, categorySlug, categoryId, isFeatured, createdAt, storeName, storeSlug, storeLogo, isVerified, isResellable, showBestSellerBadge, showNewBadge, averageRating, storeEclipseEnabled, isPayWhatYouWant, minPrice, priority = false }, ref) {
  const { addItem, isInCart } = useCart();
  const { isEligibleForDiscount, getMemberPrice, getDiscountPercent } = useSubscription();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const inCart = isInCart(id);
  const videoRef = useRef<HTMLVideoElement>(null);

  const mediaChain = useMemo(() => getCardMediaChain(images, image), [images, image]);
  const [mediaIndex, setMediaIndex] = useState(0);

  useEffect(() => {
    setMediaIndex(0);
  }, [id, mediaChain]);

  const currentMedia = mediaChain[mediaIndex] ?? null;
  const isVideo = isVideoUrl(currentMedia);
  const showMedia = Boolean(currentMedia);

  const handleMediaError = useCallback(() => {
    setMediaIndex((prev) => (prev + 1 < mediaChain.length ? prev + 1 : mediaChain.length));
  }, [mediaChain.length]);
  
  // Check if product is new (within last 7 days for stores, 3 days elsewhere)
  const isNew = showNewBadge !== undefined 
    ? showNewBadge 
    : createdAt ? (Date.now() - new Date(createdAt).getTime()) < 3 * 24 * 60 * 60 * 1000 : false;
  
  // Always show member price for eligible products (not resellable, store opted in)
  const isEligible = isEligibleForDiscount(categoryId, isResellable, storeEclipseEnabled);
  const memberPrice = isEligible ? getMemberPrice(price, categoryId, isResellable) : price;
  const discountPercent = isEligible ? getDiscountPercent(categoryId, isResellable) : 0;
  const hasMemberDiscount = isEligible && memberPrice < price;

  const handleAddToCart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!inCart) {
      addItem({
        id,
        name,
        price,
        image: currentMedia || undefined,
        slug,
        category_slug: categorySlug,
        category_id: categoryId,
        is_resellable: isResellable,
        store_eclipse_enabled: storeEclipseEnabled,
        store_name: storeName,
      });
    }
  }, [inCart, addItem, id, name, price, currentMedia, slug, categorySlug, categoryId, isResellable, storeEclipseEnabled, storeName]);

  const hoverTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (videoRef.current && isVideo) {
      videoRef.current.play().catch(() => {});
    }
    // Cycle images on hover (desktop only)
    if (mediaChain.length > 1 && !isVideo) {
      hoverTimerRef.current = setInterval(() => {
        setMediaIndex((prev) => (prev + 1) % mediaChain.length);
      }, 1200);
    }
  }, [isVideo, mediaChain.length]);

  const handleMouseLeave = useCallback(() => {
    if (videoRef.current && isVideo) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    if (hoverTimerRef.current) {
      clearInterval(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setMediaIndex(0);
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
        "overflow-hidden h-full flex flex-col rounded-lg border border-border/60 bg-card transition-all duration-300",
        "hover:border-primary/50 hover:shadow-[0_0_20px_hsl(var(--primary)/0.15)]",
        isFeatured && "border-primary/30 shadow-[0_0_12px_hsl(var(--primary)/0.1)]"
      )}>
        {/* Image/Video */}
        <div className="relative aspect-[4/3] bg-muted/30 overflow-hidden flex-shrink-0">
          {showMedia ? (
            isVideo ? (
              <BackgroundVideo
                ref={videoRef}
                src={currentMedia!}
                onError={handleMediaError}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <img
                src={currentMedia!}
                alt={name}
                loading={priority ? 'eager' : 'lazy'}
                decoding={priority ? 'sync' : 'async'}
                fetchPriority={priority ? 'high' : undefined}
                onError={handleMediaError}
                onLoad={(e) => {
                  const img = e.currentTarget;
                  if (img.naturalWidth === 0) handleMediaError();
                }}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-background">
              <span className="text-2xl font-display font-bold text-muted-foreground/30">
                {name.charAt(0)}
              </span>
            </div>
          )}
          
          {/* Quantis store product overlay */}
          {storeSlug === 'quantis' && (
            <img
              src={quantisOverlay}
              alt=""
              className="absolute inset-0 w-full h-full object-cover pointer-events-none z-[1]"
            />
          )}

          {/* Hover overlay — desktop only */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none hidden lg:block z-[2]" />
          
          {/* Badges — single row */}
          <div className="absolute top-1.5 left-1.5 flex items-center gap-1 flex-wrap z-[3]">
            {hasMemberDiscount && (
              <div className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-destructive text-destructive-foreground rounded shadow-sm">
                Sale
              </div>
            )}
            {showBestSellerBadge && (
              <div className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded shadow-sm">
                Best Seller
              </div>
            )}
            {isFeatured && !showBestSellerBadge && (
              <div className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-primary text-primary-foreground rounded">
                Featured
              </div>
            )}
            {isNew && !isFeatured && !showBestSellerBadge && (
              <div className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-emerald-500 text-white rounded">
                New
              </div>
            )}
            {category && (
              <div className="px-1.5 py-0.5 text-[9px] font-medium bg-black/60 text-white rounded backdrop-blur-sm">
                {category}
              </div>
            )}
          </div>
          
          {/* Wishlist button — always visible on mobile, hover on desktop */}
          <div className="absolute top-1.5 right-1.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-[3]">
            <WishlistButton productId={id} variant="icon" />
          </div>
        </div>

        {/* Store strip — always visible with rating */}
        <div className="h-7 flex items-center gap-1.5 px-2 xs:px-2.5 bg-muted/60 border-b border-border/50">
          {storeLogo ? (
            <img 
              src={storeLogo} 
              alt={storeName || ''}
              className="h-3.5 w-3.5 rounded-sm object-cover flex-shrink-0"
            />
          ) : (
            <div className="h-3.5 w-3.5 rounded-sm bg-muted flex items-center justify-center flex-shrink-0">
              <Store className="h-2.5 w-2.5 text-muted-foreground" />
            </div>
          )}
          <span 
            className="text-[10px] text-muted-foreground font-medium truncate hover:text-foreground transition-colors cursor-pointer"
            onClick={(e) => {
              if (storeSlug) {
                e.preventDefault();
                e.stopPropagation();
                navigate(`/store/${storeSlug}`);
              }
            }}
          >
            {storeName || 'Eclipse'}
          </span>
          {isVerified && (
            <span title="This seller has completed our identity and business verification process">
              <BadgeCheck className="h-3 w-3 text-blue-400 flex-shrink-0" />
            </span>
          )}
          {typeof averageRating === 'number' && averageRating > 0 && (
            <span className="flex items-center gap-0.5 ml-auto text-muted-foreground">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="text-[10px] font-medium">{averageRating.toFixed(1)}</span>
            </span>
          )}
        </div>

        {/* Content */}
        <div className="relative p-2 xs:p-2.5 sm:p-3 flex flex-col flex-1 gap-1 xs:gap-1.5 overflow-hidden">
          
          {/* Content layer */}
          
          <h3 className="font-display font-semibold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug flex-1">
            {name}
          </h3>

          {/* Price section */}
          <div className="flex items-center gap-1.5 mt-auto pt-1">
            {isPayWhatYouWant ? (
              <span className="text-xs sm:text-sm font-bold whitespace-nowrap leading-none text-emerald-500">
                {minPrice === 0 ? 'Free+' : `From ${formatPrice(minPrice || 0)}`}
              </span>
            ) : hasMemberDiscount ? (
              <>
                <span className="text-[10px] text-muted-foreground leading-none line-through">
                  {formatPrice(price)}
                </span>
                <span className="text-xs sm:text-sm font-bold whitespace-nowrap leading-none text-amber-400">
                  {formatPrice(memberPrice)}
                </span>
                <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-medium leading-none bg-amber-500/20 text-amber-400">
                  <Sparkles className="h-2 w-2 flex-shrink-0" />
                  {discountPercent}%
                </span>
              </>
            ) : (
              <span className="text-xs sm:text-sm font-bold whitespace-nowrap leading-none text-foreground">
                {formatPrice(price)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}));

ProductCard.displayName = 'ProductCard';
