import { memo, useCallback, useRef, forwardRef, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { ShoppingCart, Check, Store, Star } from 'lucide-react';
import { BackgroundVideo } from '@/components/ui/BackgroundVideo';
import { useCart } from '@/hooks/useCart';
import { useCurrency } from '@/hooks/useCurrency';
import { cn } from '@/lib/utils';
import { getCardMediaChain, isVideoUrl } from '@/lib/mediaUtils';
import { WishlistButton } from '@/components/wishlist/WishlistButton';
import { usePrefetchProduct } from '@/hooks/usePrefetchProduct';


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
  isPayWhatYouWant?: boolean | null;
  minPrice?: number | null;
  /** When true, loads image eagerly with high fetch priority */
  priority?: boolean;
}

export const ProductCard = memo(forwardRef<HTMLAnchorElement, ProductCardProps>(function ProductCard({ id, name, slug, price, image, images, category, categorySlug, categoryId, isFeatured, createdAt, storeName, storeSlug, storeLogo, isVerified, isResellable, showBestSellerBadge, showNewBadge, averageRating, isPayWhatYouWant, minPrice, priority = false }, ref) {
  const { addItem, isInCart } = useCart();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const prefetchProduct = usePrefetchProduct();
  const inCart = isInCart(id);
  const videoRef = useRef<HTMLVideoElement>(null);

  const mediaChain = useMemo(() => getCardMediaChain(images, image, 620, 465, 'contain'), [images, image]);
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
        store_name: storeName ?? undefined,
      });
    }
  }, [inCart, addItem, id, name, price, currentMedia, slug, categorySlug, categoryId, isResellable, storeName]);

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
      <article
        className={cn(
          'relative h-full flex flex-col bg-card contain-layout overflow-hidden rounded-xl',
          'border border-border/50 transition-all duration-300',
          'hover:border-primary/40 hover:shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.35)] active:scale-[0.97]',
          isFeatured && 'border-primary/50 shadow-[0_0_0_1px_hsl(var(--primary)/0.25)]'
        )}
      >
        {/* Vertical Featured ribbon */}
        {isFeatured && (
          <div className="absolute top-0 right-6 z-20 pointer-events-none">
            <div
              className="bg-primary text-primary-foreground text-[9px] font-bold tracking-[0.2em] uppercase px-2.5 py-4 rounded-b-sm"
              style={{ writingMode: 'vertical-lr' }}
            >
              Featured
            </div>
          </div>
        )}

        {/* Image — fills the card frame edge-to-edge, no letterboxing */}
        <div className="relative p-2 pb-0 flex-shrink-0">
          <div className="relative w-full aspect-[16/10] bg-gradient-to-br from-muted via-muted/70 to-muted rounded-lg overflow-hidden ring-1 ring-border/40">
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
                  height={465}
                  loading={priority ? 'eager' : 'lazy'}
                  decoding={priority ? 'sync' : 'async'}
                  {...(priority ? ({ fetchpriority: 'high' } as Record<string, string>) : {})}
                  onError={handleMediaError}
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    if (img.naturalWidth === 0) handleMediaError();
                  }}
                  className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
                />
              )
            ) : (
              /* Intentional cover for imageless products — a branded monogram
                 tile, not a flat grey box that reads as a stuck skeleton. */
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/15 via-card to-card relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,hsl(var(--primary)/0.12),transparent_55%)]" />
                <span className="relative text-5xl font-display font-bold text-primary/40 select-none">
                  {name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            {/* Subtle top gradient for badge legibility */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent opacity-70 z-[2]" />

            {/* Status badges (top-left) */}
            <div className="absolute top-2 left-2 flex items-center gap-1 flex-wrap z-[3]">
              {showBestSellerBadge && (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] bg-amber-500 text-black rounded-md shadow-sm">
                  Bestseller
                </span>
              )}
              {isNew && !showBestSellerBadge && (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] bg-emerald-500 text-black rounded-md shadow-sm">
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
                      i === mediaIndex ? 'w-4 bg-background' : 'w-1 bg-background/60'
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        </div>


        {/* Content */}
        <div className="p-4 flex flex-col flex-1">
          {/* Title + price header */}
          <div className="flex justify-between items-start gap-3 mb-3">
            <div className="min-w-0 flex-1 space-y-1">
              {category && (
                <span className="block text-primary text-[9px] font-semibold tracking-[0.2em] uppercase truncate">
                  {category}
                </span>
              )}
              <h3 className="text-foreground text-sm md:text-[15px] font-semibold leading-snug tracking-tight line-clamp-2 group-hover:text-primary transition-colors">
                {name}
              </h3>
              {typeof averageRating === 'number' && averageRating > 0 && (
                <span className="inline-flex items-center gap-1 pt-0.5">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {averageRating.toFixed(1)}
                  </span>
                </span>
              )}
            </div>

            <div className="text-right shrink-0">
              {isPayWhatYouWant ? (
                <span className="block text-emerald-400 text-sm md:text-base font-semibold whitespace-nowrap leading-none tracking-tight">
                  {minPrice === 0 ? 'Free+' : formatPrice(minPrice || 0)}
                </span>
              ) : (
                <span className="block text-foreground text-sm md:text-base font-semibold whitespace-nowrap leading-none tracking-tight">
                  {formatPrice(price)}
                </span>
              )}
            </div>
          </div>

          {/* Seller + cart row */}
          <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-3 mt-auto">
            <button
              type="button"
              onClick={(e) => {
                if (storeSlug) {
                  e.preventDefault();
                  e.stopPropagation();
                  navigate(`/store/${storeSlug}`);
                }
              }}
              className="flex items-center gap-2 min-w-0 text-left"
            >
              <div className="relative w-6 h-6 shrink-0">
                {storeLogo ? (
                  <img
                    src={storeLogo}
                    alt={storeName || ''}
                    className="w-6 h-6 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center border border-border">
                    <Store className="h-3 w-3 text-muted-foreground" />
                  </div>
                )}
                {isVerified && (
                  <span className="absolute -right-0.5 -bottom-0.5 bg-primary rounded-full p-[1px] border border-card">
                    <Check className="h-1.5 w-1.5 text-primary-foreground" strokeWidth={4} />
                  </span>
                )}
              </div>
              <p className="text-muted-foreground text-[11px] font-medium truncate">
                {storeName || 'Eclipse'}
              </p>
            </button>

            <button
              onClick={handleAddToCart}
              className={cn(
                'shrink-0 relative w-9 h-9 flex items-center justify-center rounded-lg border transition-all duration-200 active:scale-[0.97]',
                inCart
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                  : 'border-border text-foreground hover:border-primary hover:bg-primary hover:text-primary-foreground hover:shadow-[0_4px_14px_-4px_hsl(var(--primary)/0.5)]'
              )}
              aria-label={inCart ? 'In cart' : 'Add to cart'}
            >
              {inCart ? <Check className="h-3.5 w-3.5" /> : <ShoppingCart className="h-3.5 w-3.5" strokeWidth={1.75} />}
            </button>

          </div>
        </div>

      </article>
    </Link>
  );
}));

ProductCard.displayName = 'ProductCard';

