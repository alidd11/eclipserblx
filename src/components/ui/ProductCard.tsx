import { memo, useCallback, useRef, forwardRef, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { ShoppingCart, Check, Sparkles, BadgeCheck, Store, Star } from 'lucide-react';
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
  image?: string | null;
  images?: string[] | null;
  category?: string | null;
  categorySlug?: string | null;
  categoryId?: string | null;
  isFeatured?: boolean | null;
  createdAt?: string | null;
  storeName?: string | null;
  storeSlug?: string | null;
  storeLogo?: string | null;
  isVerified?: boolean | null;
  isResellable?: boolean | null;
  showBestSellerBadge?: boolean;
  showNewBadge?: boolean;
  averageRating?: number;
  storeEclipseEnabled?: boolean | null;
  isPayWhatYouWant?: boolean | null;
  minPrice?: number | null;
  /** When true, loads image eagerly with high fetch priority */
  priority?: boolean;
}

export const ProductCard = memo(forwardRef<HTMLAnchorElement, ProductCardProps>(function ProductCard({ id, name, slug, price, image, images, category, categorySlug, categoryId, isFeatured, createdAt, storeName, storeSlug, storeLogo, isVerified, isResellable, showBestSellerBadge, showNewBadge, averageRating, storeEclipseEnabled, isPayWhatYouWant, minPrice, priority = false }, ref) {
  const { addItem, isInCart } = useCart();
  const { isEligibleForDiscount, getMemberPrice, getDiscountPercent } = useSubscription();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const prefetchProduct = usePrefetchProduct();
  const inCart = isInCart(id);
  const videoRef = useRef<HTMLVideoElement>(null);

  const mediaChain = useMemo(() => getCardMediaChain(images, image, 620), [images, image]);
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
  
  const isNew = showNewBadge !== undefined 
    ? showNewBadge 
    : createdAt ? (Date.now() - new Date(createdAt).getTime()) < 3 * 24 * 60 * 60 * 1000 : false;
  
  const isEligible = isEligibleForDiscount(categoryId, isResellable ?? undefined, storeEclipseEnabled ?? undefined);
  const memberPrice = isEligible ? getMemberPrice(price, categoryId, isResellable ?? undefined) : price;
  const discountPercent = isEligible ? getDiscountPercent(categoryId, isResellable ?? undefined) : 0;
  const hasMemberDiscount = isEligible && memberPrice < price;

  const handleAddToCart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inCart) {
      addItem({
        id,
        name,
        price,
        image: currentMedia || undefined,
        slug,
        category_slug: categorySlug ?? undefined,
        category_id: categoryId ?? undefined,
        is_resellable: isResellable ?? undefined,
        store_eclipse_enabled: storeEclipseEnabled ?? undefined,
        store_name: storeName ?? undefined,
      });
    }
  }, [inCart, addItem, id, name, price, currentMedia, slug, categorySlug, categoryId, isResellable, storeEclipseEnabled, storeName]);

  const hoverTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleMouseEnter = useCallback(() => {
    prefetchProduct(slug);
    if (videoRef.current && isVideo) {
      videoRef.current.play().catch(() => {});
    }
    if (mediaChain.length > 1 && !isVideo) {
      hoverTimerRef.current = setInterval(() => {
        setMediaIndex((prev) => (prev + 1) % mediaChain.length);
      }, 1200);
    }
  }, [isVideo, mediaChain.length, prefetchProduct, slug]);

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
      onTouchStart={() => prefetchProduct(slug)}
    >
      <div
        className={cn(
          'relative overflow-hidden h-full flex flex-col rounded-xl bg-card contain-layout',
          'border border-border/60 transition-colors duration-200',
          'hover:border-border',
          isFeatured && 'border-primary/40'
        )}
      >
        {/* Media */}
        <div className="relative aspect-[4/3] bg-muted overflow-hidden flex-shrink-0">
          {showMedia ? (
            isVideo ? (
              <BackgroundVideo
                ref={videoRef}
                src={currentMedia!}
                onError={handleMediaError}
                className="w-full h-full object-cover object-center"
              />
            ) : (
              <img
                src={currentMedia!}
                alt={name}
                width={620}
                height={620}
                loading={priority ? 'eager' : 'lazy'}
                decoding={priority ? 'sync' : 'async'}
                {...(priority ? ({ fetchpriority: 'high' } as Record<string, string>) : {})}
                onError={handleMediaError}
                onLoad={(e) => {
                  const img = e.currentTarget;
                  if (img.naturalWidth === 0) handleMediaError();
                }}
                className="w-full h-full object-cover object-center"
              />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-background">
              <span className="text-3xl font-display font-black text-muted-foreground/20">
                {name.charAt(0)}
              </span>
            </div>
          )}

          {/* Quantis overlay */}
          {storeSlug === 'quantis' && (
            <img
              src={quantisOverlay}
              alt=""
              className="absolute inset-0 w-full h-full object-cover pointer-events-none z-[1]"
            />
          )}

          {/* Subtle bottom gradient for legibility of dot indicators */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent pointer-events-none z-[2]" />

          {/* Badges — single-line, refined */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 flex-wrap z-[3]">
            {hasMemberDiscount && (
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] bg-destructive text-destructive-foreground rounded-md">
                −{discountPercent}%
              </span>
            )}
            {showBestSellerBadge && (
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] bg-amber-500 text-black rounded-md">
                Bestseller
              </span>
            )}
            {isFeatured && !showBestSellerBadge && !hasMemberDiscount && (
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] bg-primary text-primary-foreground rounded-md">
                Featured
              </span>
            )}
            {isNew && !isFeatured && !showBestSellerBadge && !hasMemberDiscount && (
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] bg-emerald-500 text-black rounded-md">
                New
              </span>
            )}
          </div>

          {/* Wishlist */}
          <div className="absolute top-2 right-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-[3]">
            <WishlistButton productId={id} variant="icon" />
          </div>

          {/* Image dot indicators */}
          {mediaChain.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-[3]">
              {mediaChain.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-1 rounded-full transition-all',
                    i === mediaIndex ? 'w-4 bg-background' : 'w-1 bg-background/50'
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-1 gap-2.5">
          {/* Category + rating row */}
          <div className="flex items-center justify-between gap-2 min-h-[14px]">
            {category ? (
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em] truncate">
                {category}
              </span>
            ) : <span />}
            {typeof averageRating === 'number' && averageRating > 0 && (
              <span className="flex items-center gap-0.5 text-muted-foreground">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span className="text-[11px] font-semibold text-foreground/80">{averageRating.toFixed(1)}</span>
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-display font-semibold text-[15px] text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
            {name}
          </h3>

          {/* Store */}
          <div className="flex items-center gap-1.5">
            {storeLogo ? (
              <img
                src={storeLogo}
                alt={storeName || ''}
                className="h-4 w-4 rounded-full object-cover flex-shrink-0 ring-1 ring-border"
              />
            ) : (
              <div className="h-4 w-4 rounded-full bg-muted flex items-center justify-center flex-shrink-0 ring-1 ring-border">
                <Store className="h-2.5 w-2.5 text-muted-foreground" />
              </div>
            )}
            <span
              className="text-[11px] text-muted-foreground font-medium truncate hover:text-foreground transition-colors"
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
              <span title="Verified seller" className="flex-shrink-0">
                <BadgeCheck className="h-3 w-3 text-primary" />
              </span>
            )}
          </div>

          {/* Price row */}
          <div className="flex items-end justify-between gap-2 mt-auto pt-3 border-t border-border/50">
            <div className="flex items-baseline gap-1.5 min-w-0">
              {isPayWhatYouWant ? (
                <span className="text-lg font-bold whitespace-nowrap leading-none text-emerald-400">
                  {minPrice === 0 ? 'Free+' : `From ${formatPrice(minPrice || 0)}`}
                </span>
              ) : hasMemberDiscount ? (
                <>
                  <span className="text-lg font-bold whitespace-nowrap leading-none text-foreground">
                    {formatPrice(memberPrice)}
                  </span>
                  <span className="text-[11px] text-muted-foreground leading-none line-through">
                    {formatPrice(price)}
                  </span>
                </>
              ) : (
                <span className="text-lg font-bold whitespace-nowrap leading-none text-foreground">
                  {formatPrice(price)}
                </span>
              )}
            </div>

            {/* Quick-add — icon-only, subtle */}
            <button
              onClick={handleAddToCart}
              className={cn(
                'flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center transition-colors active:scale-[0.97]',
                inCart
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'text-muted-foreground hover:text-primary-foreground hover:bg-primary'
              )}
              aria-label={inCart ? 'In cart' : 'Add to cart'}
            >
              {inCart ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}));

ProductCard.displayName = 'ProductCard';
