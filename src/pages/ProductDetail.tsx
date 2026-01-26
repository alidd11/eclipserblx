import { useParams, Link, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShoppingCart, Check, ChevronLeft, Download, Shield, Zap, Package, Sparkles, ZoomIn, Star, MessageSquare, BadgeCheck, Clock } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VideoThumbnail } from '@/components/ui/VideoThumbnail';
import { ImageZoomModal } from '@/components/ui/ImageZoomModal';
import { FreeProductClaim } from '@/components/subscription/FreeProductClaim';
import { RobuxPayButton } from '@/components/payments/RobuxPayButton';
import { ReviewForm } from '@/components/reviews/ReviewForm';
import { VerifiedPurchaseBadge } from '@/components/reviews/VerifiedPurchaseBadge';
import { useCart } from '@/hooks/useCart';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { sanitizeHtml } from '@/lib/sanitize';
import { sortMediaVideosFirst, isVideoUrl } from '@/lib/mediaUtils';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { useIsMobile } from '@/hooks/use-mobile';

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { addItem, isInCart } = useCart();
  const { user } = useAuth();
  const { isStaff, loading: adminLoading } = useAdminAuth();
  const { isSubscribed, isEligibleForDiscount, isEligibleForFreeClaim, getMemberPrice, getDiscountPercent, canClaimFree } = useSubscription();
  const [selectedImage, setSelectedImage] = useState(0);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const isMobile = useIsMobile();
  const videoRef = useRef<HTMLVideoElement>(null);
  const reviewSectionRef = useRef<HTMLDivElement>(null);

  // Hide swipe hint after first interaction or after 3 seconds
  useEffect(() => {
    if (!showSwipeHint) return;
    const timer = setTimeout(() => setShowSwipeHint(false), 3000);
    return () => clearTimeout(timer);
  }, [showSwipeHint]);


  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['product', slug] });
    await queryClient.invalidateQueries({ queryKey: ['related-products'] });
    await queryClient.invalidateQueries({ queryKey: ['product-reviews', slug] });
    await queryClient.invalidateQueries({ queryKey: ['user-has-purchased'] });
  }, [queryClient, slug]);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', slug, isStaff],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`*, categories(name, slug)`)
        .eq('slug', slug);

      // Customers should only see active + released products.
      // Staff can preview scheduled and inactive products.
      if (!isStaff) {
        query = query
          .eq('is_active', true)
          .or(`release_at.is.null,release_at.lte.${new Date().toISOString()}`);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !adminLoading && slug !== undefined,
    staleTime: 0, // Always refetch when isStaff changes
  });

  const { data: relatedProducts } = useQuery({
    queryKey: ['related-products', product?.category_id, isStaff],
    queryFn: async () => {
      if (!product?.category_id) return [];
      let query = supabase
        .from('products')
        .select(`*, categories(name, slug)`)
        .eq('category_id', product.category_id)
        .neq('id', product.id);

      // Customers should only see active + released products.
      // Staff can preview scheduled and inactive products.
      if (!isStaff) {
        query = query
          .eq('is_active', true)
          .or(`release_at.is.null,release_at.lte.${new Date().toISOString()}`);
      }

      const { data, error } = await query.limit(4);
      if (error) throw error;
      return data;
    },
    enabled: !!product?.category_id,
  });

  // Check if user has purchased this product
  // (Uses a backend function so it can also match older/guest orders by customer_email)
  const { data: hasPurchased } = useQuery({
    queryKey: ['user-has-purchased', product?.id, user?.id],
    queryFn: async () => {
      if (!product?.id || !user) return false;
      const { data, error } = await supabase.functions.invoke('check-product-purchase', {
        body: { productId: product.id },
      });
      if (error) {
        console.error('Error checking purchase:', error);
        return false;
      }
      return Boolean((data as { hasPurchased?: boolean } | null)?.hasPurchased);
    },
    enabled: !!product?.id && !!user,
  });

  // Check if user has already reviewed this product
  const { data: existingReview } = useQuery({
    queryKey: ['user-existing-review', product?.id, user?.id],
    queryFn: async () => {
      if (!product?.id || !user?.id) return null;
      const { data, error } = await supabase
        .from('reviews')
        .select('id')
        .eq('product_id', product.id)
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error('Error checking review:', error);
        return null;
      }
      return data;
    },
    enabled: !!product?.id && !!user?.id,
  });

  // Fetch approved reviews for this product
  const { data: productReviews } = useQuery({
    queryKey: ['product-reviews', product?.id],
    queryFn: async () => {
      if (!product?.id) return [];
      
      // First get reviews
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('*, is_verified_purchase')
        .eq('product_id', product.id)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) {
        console.error('Error fetching reviews:', error);
        return [];
      }

      if (!reviews || reviews.length === 0) return [];

      // Get unique user IDs and fetch profiles
      const userIds = [...new Set(reviews.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Merge reviews with profiles
      return reviews.map(review => ({
        ...review,
        profile: profileMap.get(review.user_id) || null,
      }));
    },
    enabled: !!product?.id,
  });

  // Filter reviews based on verified purchase toggle
  const filteredReviews = useMemo(() => {
    if (!productReviews) return [];
    if (!showVerifiedOnly) return productReviews;
    return productReviews.filter(r => r.is_verified_purchase);
  }, [productReviews, showVerifiedOnly]);

  const verifiedCount = useMemo(() => {
    return productReviews?.filter(r => r.is_verified_purchase).length || 0;
  }, [productReviews]);

  // Scroll to reviews section if hash is #reviews
  useEffect(() => {
    if (location.hash === '#reviews' && reviewSectionRef.current && product) {
      setTimeout(() => {
        reviewSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
        setShowReviewForm(true);
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

  // Check if this is a scheduled product (for admin preview banner)
  const isScheduledProduct = product?.release_at && new Date(product.release_at) > new Date();

  if (isLoading || adminLoading) {
    return (
      <MainLayout>
        <div className="container py-8 animate-pulse space-y-8">
          <div className="h-6 bg-muted rounded w-48" />
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="aspect-video bg-muted rounded-xl" />
            <div className="space-y-4">
              <div className="h-8 bg-muted rounded w-3/4" />
              <div className="h-6 bg-muted rounded w-1/4" />
              <div className="h-24 bg-muted rounded" />
            </div>
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
  // Sort media to show videos first
  const images = product.images?.length ? sortMediaVideosFirst(product.images) : [null];

  const isEligible = isEligibleForDiscount(product.category_id, product.is_resellable);
  const memberPrice = getMemberPrice(product.price, product.category_id, product.is_resellable);
  const discountPercent = getDiscountPercent(product.category_id, product.is_resellable);
  const hasMemberDiscount = isEligible && memberPrice < product.price;
  const canClaimThisProduct = isSubscribed && canClaimFree && isEligibleForFreeClaim(product.category_id, product.is_resellable);

  const handleAddToCart = () => {
    if (!inCart) {
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.images?.[0],
        slug: product.slug,
        category_slug: product.categories?.slug,
        category_id: product.category_id,
      });
    }
  };

  return (
    <MainLayout>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="container py-8 space-y-8 overflow-x-hidden max-w-full">
        
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
        
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground overflow-x-auto scrollbar-hide max-w-full">
          <Link to="/" className="hover:text-foreground transition-colors flex-shrink-0">Home</Link>
          <span className="flex-shrink-0">/</span>
          <Link to="/products" className="hover:text-foreground transition-colors flex-shrink-0">Products</Link>
          {product.categories && (
            <>
              <span className="flex-shrink-0">/</span>
              <Link 
                to={`/products?category=${product.categories.slug}`}
                className="hover:text-foreground transition-colors flex-shrink-0"
              >
                {product.categories.name}
              </Link>
            </>
          )}
          <span className="flex-shrink-0">/</span>
          <span className="text-foreground truncate max-w-[150px] sm:max-w-none">{product.name}</span>
        </nav>

        <Link to="/products" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
          Back to Products
        </Link>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 max-w-full">
          {/* Images */}
          <div className="space-y-4 min-w-0">
            <div 
              className="aspect-[4/3] gaming-card overflow-hidden select-none relative bg-black/20 cursor-zoom-in group w-full touch-pan-y"
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
                  <video
                    ref={videoRef}
                    src={images[selectedImage]}
                    autoPlay
                    loop
                    muted
                    playsInline
                    controls
                    controlsList="nodownload"
                    className="w-full h-full object-contain pointer-events-auto cursor-default"
                    onContextMenu={(e) => e.preventDefault()}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <img
                    src={images[selectedImage]}
                    alt={product.name}
                    className="w-full h-full object-contain pointer-events-none transition-transform duration-300 group-hover:scale-[1.02]"
                    draggable={false}
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
                  <div className="bg-black/60 rounded-full p-2">
                    <ZoomIn className="h-5 w-5 text-white" />
                  </div>
                </div>
              )}
              
              
              {/* Pagination dots */}
              {images.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 pointer-events-none">
                  {images.map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all duration-200",
                        selectedImage === i 
                          ? "bg-primary w-4" 
                          : "bg-white/50"
                      )}
                    />
                  ))}
                </div>
              )}
              
              {/* Swipe hint overlay - mobile only */}
              {isMobile && images.length > 1 && showSwipeHint && (
                <div 
                  className="absolute inset-0 flex items-center justify-center bg-black/40 animate-fade-in pointer-events-none"
                  onAnimationEnd={() => {}}
                >
                  <div className="flex items-center gap-3 text-white/90">
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
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img, i) => {
                  const isVideo = isVideoUrl(img);
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(i)}
                      className={cn(
                        "flex-shrink-0 w-20 aspect-video rounded-lg overflow-hidden border-2 transition-colors",
                        selectedImage === i ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
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
          </div>

          {/* Details */}
          <div className="space-y-6">
            <Card className="bg-card border-border">
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-2">
                  {product.categories && (
                    <Badge variant="outline" className="text-primary border-primary">
                      {product.categories.name}
                    </Badge>
                  )}
                  <h1 className="text-3xl md:text-4xl font-display font-bold">{product.name}</h1>
                  {product.is_featured && (
                    <Badge className="bg-primary/10 text-primary border-primary/20">
                      Featured Product
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  {/* Regular price - shown prominently when not eligible for discount */}
                  {!isEligible ? (
                    <span className="text-4xl font-bold">
                      £{product.price.toFixed(2)}
                    </span>
                  ) : (
                    <>
                      {/* Regular price strikethrough */}
                      <p className="text-lg text-muted-foreground line-through">
                        £{product.price.toFixed(2)}
                      </p>
                      {/* Member price prominently displayed */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-4xl font-bold flex items-center gap-2 text-amber-400">
                          <Sparkles className="h-6 w-6" />
                          £{memberPrice.toFixed(2)}
                        </span>
                        <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">
                          {discountPercent}% off with Eclipse+
                        </Badge>
                      </div>
                      {/* Call to action for non-subscribers */}
                      {!isSubscribed && (
                        <Link 
                          to="/eclipse-plus" 
                          className="inline-flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 transition-colors"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          Join Eclipse+ to unlock this price
                        </Link>
                      )}
                    </>
                  )}
                </div>

                {product.description && (
                  <div 
                    className="prose prose-invert prose-sm max-w-none text-muted-foreground [&>p]:leading-relaxed [&>p]:mb-4 [&>p:last-child]:mb-0 [&>p:empty]:h-4 [&>h2]:text-foreground [&>h2]:text-lg [&>h2]:font-semibold [&>h2]:mt-6 [&>h2]:mb-3 [&>h3]:text-foreground [&>h3]:text-base [&>h3]:font-medium [&>h3]:mt-5 [&>h3]:mb-2 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-4 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-4 [&>hr]:border-border [&>hr]:my-6 [&_br]:block [&_br]:content-[''] [&_br]:mt-4"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.description) }}
                  />
                )}

                {/* Free Claim for Eclipse+ Members */}
                {canClaimThisProduct && (
                  <FreeProductClaim 
                    productId={product.id} 
                    productName={product.name} 
                    categoryId={product.category_id}
                    isResellable={product.is_resellable}
                  />
                )}

                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                      size="lg"
                      className={cn(
                        "flex-1 h-14 text-lg",
                        !inCart && "gradient-button border-0"
                      )}
                      variant={inCart ? "secondary" : "default"}
                      onClick={handleAddToCart}
                    >
                      {inCart ? (
                        <>
                          <Check className="h-5 w-5 mr-2" />
                          Added to Cart
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="h-5 w-5 mr-2" />
                          Add to Cart
                        </>
                      )}
                    </Button>
                    
                    {inCart && (
                      <Button size="lg" asChild className="h-14">
                        <Link to="/cart">View Cart</Link>
                      </Button>
                    )}
                  </div>
                  
                  {/* Robux payment option - exclude bots category */}
                  {product.categories?.slug !== 'bots' && (
                    <RobuxPayButton />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Trust badges */}
            <Card className="bg-card border-border">
              <CardContent className="py-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                      <Download className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground">Instant Download</p>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground">Secure Payment</p>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                      <Zap className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground">24/7 Support</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Reviews Section */}
        <div ref={reviewSectionRef} id="reviews" className="scroll-mt-8">
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Customer Reviews
                </CardTitle>
                {hasPurchased && !existingReview && user && (
                  <Button 
                    onClick={() => setShowReviewForm(!showReviewForm)}
                    variant={showReviewForm ? "outline" : "default"}
                    size="sm"
                  >
                    <Star className="h-4 w-4 mr-2" />
                    {showReviewForm ? 'Cancel' : 'Write a Review'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Review Form - only show if user purchased and hasn't reviewed */}
              {showReviewForm && hasPurchased && !existingReview && user && (
                <div className="border-b border-border pb-6">
                  <ReviewForm 
                    productId={product.id} 
                    productName={product.name}
                    isVerifiedPurchase={true}
                    onSuccess={() => {
                      setShowReviewForm(false);
                      queryClient.invalidateQueries({ queryKey: ['product-reviews', product.id] });
                      queryClient.invalidateQueries({ queryKey: ['user-existing-review', product.id, user.id] });
                      // Mark review reminder as submitted
                      supabase
                        .from('review_reminders')
                        .update({ review_submitted: true })
                        .eq('user_id', user.id)
                        .eq('product_id', product.id)
                        .then(() => {});
                    }}
                  />
                </div>
              )}

              {/* Existing Review Notice */}
              {existingReview && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center">
                  <p className="text-sm text-primary">
                    ✓ You've already submitted a review for this product. Thank you!
                  </p>
                </div>
              )}

              {/* Purchase Required Notice */}
              {user && !hasPurchased && (
                <div className="bg-muted/50 border border-border rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Purchase this product to leave a review
                  </p>
                </div>
              )}

              {/* Sign In Notice */}
              {!user && (
                <div className="bg-muted/50 border border-border rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    <Link to="/auth" className="text-primary hover:underline">Sign in</Link> to leave a review
                  </p>
                </div>
              )}

              {/* Verified Filter Toggle */}
              {productReviews && productReviews.length > 0 && verifiedCount > 0 && (
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <span className="text-sm text-muted-foreground">
                    {productReviews.length} {productReviews.length === 1 ? 'review' : 'reviews'} 
                    {verifiedCount > 0 && ` (${verifiedCount} verified)`}
                  </span>
                  <Button
                    variant={showVerifiedOnly ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowVerifiedOnly(!showVerifiedOnly)}
                    className="gap-1.5"
                  >
                    <BadgeCheck className="h-4 w-4" />
                    Verified Only
                  </Button>
                </div>
              )}

              {/* Reviews List */}
              {filteredReviews && filteredReviews.length > 0 ? (
                <div className="space-y-4">
                  {filteredReviews.map((review) => (
                    <div key={review.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          {review.profile?.avatar_url ? (
                            <img 
                              src={review.profile.avatar_url} 
                              alt="" 
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-bold text-primary">
                              {(review.profile?.display_name || review.external_reviewer_name || 'U').charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">
                              {review.profile?.display_name || review.external_reviewer_name || 'Anonymous'}
                            </span>
                            {review.is_verified_purchase && <VerifiedPurchaseBadge />}
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star 
                                  key={star}
                                  className={cn(
                                    "h-3.5 w-3.5",
                                    star <= review.rating 
                                      ? "text-amber-400 fill-amber-400" 
                                      : "text-muted-foreground"
                                  )}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(review.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {review.title && (
                            <h4 className="font-medium mt-1">{review.title}</h4>
                          )}
                          <p className="text-sm text-muted-foreground mt-1">
                            {review.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : showVerifiedOnly && productReviews && productReviews.length > 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No verified purchase reviews yet.
                </p>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  No reviews yet. Be the first to share your experience!
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {relatedProducts && relatedProducts.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Related Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {relatedProducts.map((p) => (
                  <Link 
                    key={p.id} 
                    to={`/products/${p.slug}`}
                    className="group rounded-lg overflow-hidden bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="aspect-video bg-muted overflow-hidden">
                      {p.images?.[0] ? (
                        <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-3xl font-bold text-muted-foreground/30">{p.name.charAt(0)}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold truncate group-hover:text-primary transition-colors">{p.name}</h3>
                      <p className="text-primary font-bold">£{p.price.toFixed(2)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        </div>
      </PullToRefresh>
    </MainLayout>
  );
}
