import { useParams, Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Check, ChevronLeft, Sparkles, ZoomIn, Star, MessageSquare, Clock, Flag, Share2, Heart, Shield } from 'lucide-react';
import { StoreTrustSignals } from '@/components/store/StoreTrustSignals';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { VideoThumbnail } from '@/components/ui/VideoThumbnail';
import { ImageZoomModal } from '@/components/ui/ImageZoomModal';
import { RobuxPayButton } from '@/components/payments/RobuxPayButton';
import { BotLicenseBundleSelector } from '@/components/bots/BotLicenseBundleSelector';
import { StoreDetailsCard } from '@/components/product/StoreDetailsCard';
import { ReportIPViolationDialog } from '@/components/product/ReportIPViolationDialog';
import { DescriptionSection } from '@/components/product/DescriptionSection';
import { useCart, CartItem } from '@/hooks/useCart';
import { cn } from '@/lib/utils';
import { sanitizeHtml } from '@/lib/sanitize';
import { sortMediaVideosFirst, isVideoUrl } from '@/lib/mediaUtils';
import { BackgroundVideo } from '@/components/ui/BackgroundVideo';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCurrency } from '@/hooks/useCurrency';
import { usePageTracking } from '@/hooks/usePageTracking';
import { usePageMeta } from '@/hooks/usePageMeta';
import { BreadcrumbSchema, ProductSchema } from '@/components/seo/StructuredData';
import { ReviewSchema } from '@/components/seo/ReviewSchema';
import { RecentlyViewedProducts } from '@/components/product/RecentlyViewedProducts';
import { FrequentlyBoughtTogether } from '@/components/product/FrequentlyBoughtTogether';
import { ProductReviewsSection } from '@/components/product/ProductReviewsSection';
import { RelatedProductsSection } from '@/components/product/RelatedProductsSection';
import { usePromotedProduct } from '@/hooks/usePromotedProduct';
import { PromotedProductCard } from '@/components/marketplace/PromotedProductCard';
import { PriceAlertButton } from '@/components/product/PriceAlertButton';
import { SocialShareButtons } from '@/components/product/SocialShareButtons';
import { StickyBuyBar } from '@/components/product/StickyBuyBar';
import { supabase } from '@/integrations/supabase/client';
import { useProductDetailData } from './product-detail/useProductDetailData';

export default function ProductDetail() {
 const { productNumber } = useParams<{ productNumber: string }>();
 usePageTracking({ pagePath: `/products/${productNumber}` });
 const location = useLocation();
 const { addItem, isInCart } = useCart();
 const { formatPrice } = useCurrency();
 const [selectedImage, setSelectedImage] = useState(0);
 const [isZoomOpen, setIsZoomOpen] = useState(false);
 const [showSwipeHint, setShowSwipeHint] = useState(true);
 const [showIPReportDialog, setShowIPReportDialog] = useState(false);
 const [pwywAmount, setPwywAmount] = useState<string>('');
 const [selectedBundle, setSelectedBundle] = useState<{
 id: string;
 quantity: number;
 price_gbp: number;
 savings_percent: number;
 label: string;
 } | null>(null);
 const isMobile = useIsMobile();
 const videoRef = useRef<HTMLVideoElement>(null);
 const reviewSectionRef = useRef<HTMLDivElement>(null);
 const ctaButtonRef = useRef<HTMLButtonElement>(null);

 const {
  product, isLoading, adminLoading, isStaff, user,
  relatedProducts, hasPurchased, existingReview, productReviews,
  averageRating, reviewCount, getTranslatedName, getTranslatedDescription,
  addToRecentlyViewed, isEligible, memberPrice, discountPercent,
  storeEclipseEnabled,
 } = useProductDetailData(productNumber);

 // Hide swipe hint after first interaction or after 3 seconds
 useEffect(() => {
 if (!showSwipeHint) return;
 const timer = setTimeout(() => setShowSwipeHint(false), 3000);
 return () => clearTimeout(timer);
 }, [showSwipeHint]);

 // Track recently viewed product + category affinity
 useEffect(() => {
 if (product) {
 addToRecentlyViewed({
 id: product.id,
 slug: String((product as any).product_number),
 name: product.name,
 image: product.images?.[0],
 price: product.price,
 });

 if (user?.id && product.category_id) {
 supabase.rpc('update_category_affinity', {
 p_user_id: user.id,
 p_category_id: product.category_id,
 p_weight: 1.0,
 }).then(({ error }) => {
 if (error) console.debug('Affinity update skipped:', error.message);
 });
 }
 }
 }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

 // Dynamic SEO meta for product pages
 usePageMeta({
 title: product?.name,
 description: product?.description
 ? product.description.replace(/<[^>]*>/g, '').slice(0, 155)
 : product?.name
 ? `Buy ${product.name} on Eclipse marketplace`
 : undefined,
 canonicalPath: productNumber ? `/products/${productNumber}` : undefined,
 ogImage: product?.images?.[0] || undefined,
 });

 const breadcrumbItems = useMemo(() => {
 const items = [{ name: 'Home', url: 'https://eclipserblx.com/' }];
 if (product?.categories?.name && product?.categories?.slug) {
 items.push({ name: product.categories.name, url: `https://eclipserblx.com/products?category=${product.categories.slug}` });
 }
 if (product?.name) {
 items.push({ name: product.name, url: `https://eclipserblx.com/products/${(product as any).product_number}` });
 }
 return items;
 }, [product?.categories?.name, product?.categories?.slug, product?.name, productNumber]);

 // Scroll to reviews section if hash is #reviews
 useEffect(() => {
 if (location.hash === '#reviews' && reviewSectionRef.current && product) {
 setTimeout(() => {
 reviewSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
 }, 500);
 }
 }, [location.hash, product]);

 const handleSwipeLeft = useCallback(() => {
 if (!product?.images?.length) return;
 const count = product.images.length;
 setSelectedImage((prev) => (prev + 1) % count);
 setShowSwipeHint(false);
 }, [product?.images?.length]);

 const handleSwipeRight = useCallback(() => {
 if (!product?.images?.length) return;
 const count = product.images.length;
 setSelectedImage((prev) => (prev - 1 + count) % count);
 setShowSwipeHint(false);
 }, [product?.images?.length]);

 const swipeHandlers = useSwipeGesture({
 onSwipeLeft: (product?.images?.length || 0) > 1 ? handleSwipeLeft : undefined,
 onSwipeRight: (product?.images?.length || 0) > 1 ? handleSwipeRight : undefined,
 minSwipeDistance: 50,
 });

 const isScheduledProduct = product?.release_at && new Date(product.release_at) > new Date();

 // Pay What You Want
 const isPWYW = !!(product as any)?.is_pay_what_you_want;
 const pwywMinPrice = (product as any)?.min_price ?? 0;
 const pwywSuggestedPrice = product?.price ?? 0;

 useEffect(() => {
 if (isPWYW && !pwywAmount) {
 setPwywAmount(pwywSuggestedPrice.toString());
 }
 }, [isPWYW, pwywSuggestedPrice]);

 if (isLoading || adminLoading) {
 return (
 <MainLayout>
 <div className="container py-8 space-y-8" aria-busy="true" aria-label="Loading product details">
 <Skeleton className="h-6 w-48" />
 <div className="grid lg:grid-cols-2 gap-8">
 <Skeleton className="aspect-video w-full rounded-xl" />
 <div className="space-y-4">
 <Skeleton className="h-8 w-3/4" />
 <Skeleton className="h-6 w-1/4" />
 <Skeleton className="h-24 w-full" />
 <Skeleton className="h-10 w-40" />
 <div className="flex gap-2 pt-2">
 <Skeleton className="h-8 w-20 rounded-full" />
 <Skeleton className="h-8 w-20 rounded-full" />
 <Skeleton className="h-8 w-20 rounded-full" />
 </div>
 </div>
 </div>
 <Skeleton className="h-6 w-36 mt-8" />
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 {[1, 2, 3, 4].map(i => (
 <Skeleton key={i} className="h-48 rounded-lg" />
 ))}
 </div>
 </div>
 </MainLayout>
 );
 }

 if (!product) {
 return (
 <MainLayout>
 <div className="container py-16 text-center space-y-4">
 <h1 className="text-3xl font-display font-bold">Product Not Found</h1>
 <p className="text-muted-foreground">The product you're looking for doesn't exist.</p>
 <Button asChild>
 <Link to="/products">Browse Products</Link>
 </Button>
 </div>
 </MainLayout>
 );
 }

 const inCart = isInCart(product.id);
 const images = product.images?.length ? sortMediaVideosFirst(product.images) : [null];
 const hasMemberDiscount = isEligible && memberPrice < product.price;
 const isBotProduct = product.categories?.slug === 'bots';

 const getPwywCartPrice = () => {
 const amount = parseFloat(pwywAmount) || 0;
 return Math.max(amount, pwywMinPrice);
 };

 const handleAddToCart = () => {
 if (!inCart) {
 const effectivePrice = isPWYW 
 ? getPwywCartPrice() 
 : (isBotProduct && selectedBundle ? selectedBundle.price_gbp : product.price);

 const cartItem: CartItem = {
 id: product.id,
 name: product.name,
 price: effectivePrice,
 image: product.images?.[0],
 slug: String((product as any).product_number || product.slug),
 category_slug: product.categories?.slug,
 category_id: product.category_id,
 is_resellable: product.is_resellable,
 store_eclipse_enabled: storeEclipseEnabled,
 store_name: product.stores?.name,
 is_pwyw: isPWYW || undefined,
 custom_price: isPWYW ? effectivePrice : undefined,
 };

 if (isBotProduct && selectedBundle) {
 cartItem.quantity = selectedBundle.quantity;
 cartItem.bundle_id = selectedBundle.id;
 cartItem.bundle_label = selectedBundle.label;
 cartItem.name = `${product.name} (${selectedBundle.label})`;
 }

 addItem(cartItem);
 }
 };

 return (
 <MainLayout>
 {product && breadcrumbItems.length > 1 && <BreadcrumbSchema items={breadcrumbItems} />}
 {product && (
 <ProductSchema
 name={product.name}
 description={product.description?.replace(/<[^>]*>/g, '').slice(0, 300) || product.name}
 image={product.images?.[0] || ''}
 price={product.price}
 seller={product.stores?.name || 'Eclipse'}
 sellerUrl={product.stores?.slug ? `https://eclipserblx.com/store/${product.stores.slug}` : undefined}
 rating={averageRating || undefined}
 reviewCount={reviewCount || undefined}
 sku={product.id}
 slug={String((product as any).product_number)}
 brand={product.stores?.name || 'Eclipse'}
 category={(product as any).categories?.name}
 />
 )}
 {product && productReviews && productReviews.length > 0 && (
 <ReviewSchema
 productName={product.name}
 reviews={productReviews.map(r => ({
 rating: r.rating,
 reviewBody: r.content || undefined,
 authorName: r.profile?.display_name || 'Eclipse User',
 datePublished: r.created_at,
 }))}
 />
 )}
 
 <div className="container py-4 sm:py-8 space-y-4 pb-14 md:pb-8">
 
 {/* Admin Preview Banner for Scheduled Products */}
 {isStaff && isScheduledProduct && (
 <div className="bg-amber-500/20 border border-amber-500/30 rounded-lg p-4 flex items-center gap-3">
 <Clock className="h-5 w-5 text-amber-500 flex-shrink-0" />
 <div>
 <p className="font-medium text-amber-600 dark:text-amber-400">
 Scheduled Product (Admin Preview)
 </p>
 <p className="text-sm text-muted-foreground">
 This product is scheduled to release on {new Date(product.release_at!).toLocaleString()}. 
 It is not visible to customers yet.
 </p>
 </div>
 </div>
 )}

 <div className="grid lg:grid-cols-2 gap-5 lg:gap-10 max-w-full">
 {/* Images */}
 <div className="space-y-3 min-w-0">
 <div 
 className="aspect-[16/10] lg:aspect-auto lg:max-h-[500px] rounded-xl overflow-hidden select-none relative bg-muted/30 cursor-zoom-in group w-full touch-pan-y border border-border/30 flex items-center justify-center"
 onContextMenu={(e) => e.preventDefault()}
 onClick={() => {
 const currentImg = images[selectedImage];
 if (currentImg && !/\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(currentImg)) {
 setIsZoomOpen(true);
 }
 }}
 {...swipeHandlers}
 >
 {images[selectedImage] ? (
 isVideoUrl(images[selectedImage]) ? (
 <BackgroundVideo
 ref={videoRef}
 src={images[selectedImage]}
 className="w-full h-full object-contain"
 />
 ) : (
 <img
 src={images[selectedImage]}
 alt={product.name}
 className="w-full h-full object-contain pointer-events-none transition-transform duration-300"
 draggable={false}
 onError={() => {
 if (selectedImage + 1 < images.length) {
 setSelectedImage(selectedImage + 1);
 }
 }}
 onLoad={(e) => {
 const img = e.currentTarget;
 if (img.naturalWidth === 0 && selectedImage + 1 < images.length) {
 setSelectedImage(selectedImage + 1);
 }
 }}
 />
 )
 ) : (
 <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-background">
 <span className="text-6xl font-display font-bold text-muted-foreground/30">
 {product.name.charAt(0)}
 </span>
 </div>
 )}
 
 {/* Zoom hint */}
 {images[selectedImage] && !isVideoUrl(images[selectedImage]) && (
 <div className="absolute top-3 right-3 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
 <div className="bg-foreground/60 rounded-full p-2">
 <ZoomIn className="h-5 w-5 text-foreground" />
 </div>
 </div>
 )}
 
 {/* Pagination dots */}
 {images.length > 1 && (
 <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 pointer-events-none z-20">
 {images.map((_, i) => (
 <div
 key={i}
 className={cn(
 "h-1.5 rounded-full transition-all duration-200",
 selectedImage === i 
 ? "bg-primary w-4" 
 : "bg-background/40 w-1.5"
 )}
 />
 ))}
 </div>
 )}
 
 {/* Swipe hint overlay - mobile only */}
 {isMobile && images.length > 1 && showSwipeHint && (
 <div 
 className="absolute inset-0 flex items-center justify-center bg-foreground/40 animate-fade-in pointer-events-none"
 onAnimationEnd={() => {}}
 >
 <div className="flex items-center gap-3 text-foreground/90">
 <ChevronLeft className="h-6 w-6 animate-pulse" />
 <span className="text-sm font-medium">Swipe to browse</span>
 <ChevronLeft className="h-6 w-6 rotate-180 animate-pulse" />
 </div>
 </div>
 )}
 </div>
 
 {/* Zoom Modal */}
 {images[selectedImage] && !isVideoUrl(images[selectedImage]) && (
 <ImageZoomModal
 src={images[selectedImage]}
 alt={product.name}
 isOpen={isZoomOpen}
 onClose={() => setIsZoomOpen(false)}
 />
 )}
 
 {images.length > 1 && (
 <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
 {images.map((img, i) => {
 const isVideo = isVideoUrl(img);
 return (
 <button
 key={i}
 onClick={() => setSelectedImage(i)}
 className={cn(
 "flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all",
 selectedImage === i ? "border-primary ring-1 ring-primary/30" : "border-border/40 opacity-50 hover:opacity-90"
 )}
 >
 {img ? (
 isVideo ? (
 <VideoThumbnail src={img} showPlayIcon={true} />
 ) : (
 <img src={img} alt="" className="w-full h-full object-cover" draggable={false} />
 )
 ) : (
 <div className="w-full h-full bg-muted" />
 )}
 </button>
 );
 })}
 </div>
 )}
 
 {product.stores && (
 <StoreDetailsCard store={product.stores} className="w-full" />
 )}
 </div>

 {/* Details */}
 <div className="space-y-4">
 <div className="rounded-xl border-border/50 bg-card overflow-hidden relative">
 <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
 <div className="p-4 pt-5 space-y-4">
 <div className="space-y-2">
 <div className="flex items-center gap-2 flex-wrap">
 {product.categories && (
 <Badge variant="outline" className="text-primary border-primary">
 {product.categories.name}
 </Badge>
 )}
 {product.is_featured && (
 <Badge className="bg-primary/10 text-primary border-primary/20">
 Featured Product
 </Badge>
 )}
 </div>
 <h1 className="text-2xl md:text-3xl font-display font-bold">{getTranslatedName(product.name)}</h1>
 </div>

 <div className="space-y-2">
 {isPWYW ? (
 <div className="space-y-4">
 <div className="flex items-center gap-2">
 <Heart className="h-5 w-5 text-emerald-500" />
 <span className="text-sm font-medium text-emerald-500">Pay What You Want</span>
 </div>
 {pwywSuggestedPrice > 0 && (
 <p className="text-sm text-muted-foreground">
 Suggested price: {formatPrice(pwywSuggestedPrice)}
 </p>
 )}
 <div className="flex items-center gap-3">
 <span className="text-lg font-medium text-muted-foreground">£</span>
 <input
 type="number"
 step="0.01"
 min={pwywMinPrice}
 value={pwywAmount}
 onChange={(e) => setPwywAmount(e.target.value)}
 className="text-3xl font-bold bg-transparent border-b-2 border-border focus:border-primary outline-none w-32 text-foreground"
 placeholder="0.00"
 />
 </div>
 {pwywMinPrice === 0 && (
 <p className="text-xs text-muted-foreground">
 Enter £0 for a free download, or pay any amount to support the creator
 </p>
 )}
 {pwywMinPrice > 0 && (
 <p className="text-xs text-muted-foreground">
 Minimum: {formatPrice(pwywMinPrice)}
 </p>
 )}
 {parseFloat(pwywAmount) > 0 && parseFloat(pwywAmount) < 1 && (
 <p className="text-xs text-destructive">
 Paid amounts must be at least £1.00
 </p>
 )}
 </div>
 ) : isBotProduct ? (
 <div className="space-y-4">
 <BotLicenseBundleSelector
 productId={product.id}
 onBundleSelect={setSelectedBundle}
 selectedBundleId={selectedBundle?.id}
 />
 {selectedBundle && (
 <div className="pt-2">
 <span className="text-3xl font-bold">
 {formatPrice(selectedBundle.price_gbp)}
 </span>
 {selectedBundle.quantity > 1 && (
 <span className="text-sm text-muted-foreground ml-2">
 for {selectedBundle.quantity} licenses
 </span>
 )}
 </div>
 )}
 </div>
 ) : (
 <>
 {!isEligible ? (
 <span className="text-3xl font-bold">
 {formatPrice(Number(product.price))}
 </span>
 ) : (
 <>
 <p className="text-lg text-muted-foreground line-through">
 {formatPrice(Number(product.price))}
 </p>
 <div className="flex items-center gap-3 flex-wrap">
 <span className="text-3xl font-bold flex items-center gap-2 text-amber-400">
 <Sparkles className="h-6 w-6" />
 {formatPrice(memberPrice)}
 </span>
 <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">
 {discountPercent}% off
 </Badge>
 </div>
 </>
 )}
 </>
 )}
 </div>

{(getTranslatedDescription(product.description) || product.description) && (
 <DescriptionSection html={sanitizeHtml(getTranslatedDescription(product.description) || product.description)} />
 )}


 <div className="flex flex-col gap-3">
 <div className="flex flex-col sm:flex-row gap-3">
 <Button
 ref={ctaButtonRef as React.RefObject<HTMLButtonElement>}
 size="lg"
 className={cn(
 "flex-1 h-12 text-base font-semibold",
 !inCart && "gradient-button border-0"
 )}
 variant={inCart ? "secondary" : "default"}
 onClick={handleAddToCart}
 disabled={isPWYW && parseFloat(pwywAmount) > 0 && parseFloat(pwywAmount) < 1}
 >
 {inCart ? (
 <>
 <Check className="h-5 w-5 mr-2" />
 Added to Cart
 </>
 ) : isPWYW && getPwywCartPrice() === 0 ? (
 <>
 <Heart className="h-5 w-5 mr-2" />
 Get for Free
 </>
 ) : (
 <>
 <ShoppingCart className="h-5 w-5 mr-2" />
 {isPWYW ? `Add to Cart — ${formatPrice(getPwywCartPrice())}` : 'Add to Cart'}
 </>
 )}
 </Button>
 
 {inCart && (
 <Button size="lg" asChild className="h-12">
 <Link to="/cart">View Cart</Link>
 </Button>
 )}
 </div>
 
 {product.categories?.slug !== 'bots' && !(isPWYW && getPwywCartPrice() === 0) && (
 <RobuxPayButton />
 )}
 </div>

 {/* Trust signals near CTA */}
 {product.stores && (
 <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 flex-wrap">
 <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Buyer Protection</span>
 <span className="flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Instant Delivery</span>
 {product.stores.is_verified && (
 <span className="flex items-center gap-1"><Check className="h-3.5 w-3.5 text-primary" /> Verified Seller</span>
 )}
 </div>
 )}

 {/* Actions row */}
 <div className="flex items-center justify-between pt-3 border-t border-border/60">
 <SocialShareButtons
 url={`/products/${(product as any).product_number || productNumber}`}
 title={product.name}
 description={`Check out ${product.name} on Eclipse`}
 />
 <div className="flex items-center gap-1">
 {user && (
 <PriceAlertButton
 productId={product.id}
 currentPrice={product.price}
 className="h-8 px-2.5 text-xs"
 />
 )}
 <Button
 variant="ghost"
 size="sm"
 className="h-8 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
 onClick={() => setShowIPReportDialog(true)}
 >
 <Flag className="h-3.5 w-3.5" />
 Report
 </Button>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Reviews Section */}
 <ProductReviewsSection
 ref={reviewSectionRef as React.RefObject<HTMLElement>}
 productId={product.id}
 productName={product.name}
 reviews={productReviews || []}
 userId={user?.id}
 hasPurchased={!!hasPurchased}
 existingReview={!!existingReview}
 />
 </div>

 <RelatedProductsSection products={relatedProducts || []} />
 <FrequentlyBoughtTogether productId={product.id} categoryId={product.category_id} storeId={product.store_id} />
 <SponsoredProductSection categoryId={product.category_id} />
 <RecentlyViewedProducts currentProductId={product.id} />
 </div>
 


 {/* IP Violation Report Dialog */}
 <ReportIPViolationDialog
 open={showIPReportDialog}
 onOpenChange={setShowIPReportDialog}
 productId={product.id}
 productName={product.name}
 />
 </MainLayout>
 );
}

function SponsoredProductSection({ categoryId }: { categoryId: string | null }) {
 const { promotedProduct, trackClick } = usePromotedProduct('product_detail', categoryId || undefined);
 
 if (!promotedProduct?.product) return null;
 
 return (
 <div className="space-y-3">
 <h3 className="text-sm font-semibold text-muted-foreground">Sponsored</h3>
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
 <PromotedProductCard
 product={promotedProduct.product}
 onClickTracked={trackClick}
 />
 </div>
 </div>
 );
}
