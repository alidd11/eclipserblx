import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShoppingCart, Check, ChevronLeft, Download, Shield, Zap, Package, Sparkles, ZoomIn } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VideoThumbnail } from '@/components/ui/VideoThumbnail';
import { ImageZoomModal } from '@/components/ui/ImageZoomModal';
import { FreeProductClaim } from '@/components/subscription/FreeProductClaim';
import { useCart } from '@/hooks/useCart';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { sanitizeHtml } from '@/lib/sanitize';
import { useState, useCallback, useMemo } from 'react';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const queryClient = useQueryClient();
  const { addItem, isInCart } = useCart();
  const { isSubscribed, isEligibleForDiscount, isEligibleForFreeClaim, getMemberPrice, getDiscountPercent, canClaimFree } = useSubscription();
  const [selectedImage, setSelectedImage] = useState(0);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['product', slug] });
    await queryClient.invalidateQueries({ queryKey: ['related-products'] });
  }, [queryClient, slug]);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`*, categories(name, slug)`)
        .eq('slug', slug)
        .eq('is_active', true)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: relatedProducts } = useQuery({
    queryKey: ['related-products', product?.category_id],
    queryFn: async () => {
      if (!product?.category_id) return [];
      const { data, error } = await supabase
        .from('products')
        .select(`*, categories(name, slug)`)
        .eq('category_id', product.category_id)
        .neq('id', product.id)
        .eq('is_active', true)
        .limit(4);
      if (error) throw error;
      return data;
    },
    enabled: !!product?.category_id,
  });

  const handleSwipeLeft = useCallback(() => {
    if (!product?.images?.length) return;
    const count = product.images.length;
    setSelectedImage((prev) => (prev + 1) % count);
  }, [product?.images?.length]);

  const handleSwipeRight = useCallback(() => {
    if (!product?.images?.length) return;
    const count = product.images.length;
    setSelectedImage((prev) => (prev - 1 + count) % count);
  }, [product?.images?.length]);

  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: (product?.images?.length || 0) > 1 ? handleSwipeLeft : undefined,
    onSwipeRight: (product?.images?.length || 0) > 1 ? handleSwipeRight : undefined,
    minSwipeDistance: 50,
  });

  if (isLoading) {
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

  const isEligible = isEligibleForDiscount(product.category_id);
  const memberPrice = getMemberPrice(product.price, product.category_id);
  const discountPercent = getDiscountPercent(product.category_id);
  const hasMemberDiscount = isEligible && memberPrice < product.price;
  const canClaimThisProduct = isSubscribed && canClaimFree && isEligibleForFreeClaim(product.category_id);

  const handleAddToCart = () => {
    if (!inCart) {
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.images?.[0],
        slug: product.slug,
        category_slug: product.categories?.slug,
      });
    }
  };

  return (
    <MainLayout>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="container py-8 space-y-8 overflow-x-hidden max-w-full">
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
                /\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(images[selectedImage]) ? (
                  <video
                    src={images[selectedImage]}
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
              {images[selectedImage] && !/\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(images[selectedImage]) && (
                <div className="absolute top-3 right-3 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-black/60 rounded-full p-2">
                    <ZoomIn className="h-5 w-5 text-white" />
                  </div>
                </div>
              )}
              
              {/* Watermark overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-32 h-32 opacity-40">
                  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]">
                    {/* Outer ring */}
                    <circle 
                      cx="50" cy="50" r="45" 
                      fill="none" 
                      stroke="url(#watermark-gradient)" 
                      strokeWidth="3"
                    />
                    {/* Inner eclipse shape */}
                    <ellipse 
                      cx="50" cy="50" 
                      rx="30" ry="30" 
                      fill="none" 
                      stroke="url(#watermark-gradient)" 
                      strokeWidth="2"
                    />
                    {/* Eclipse crescent */}
                    <path 
                      d="M 65 50 A 20 20 0 1 1 65 50.01" 
                      fill="url(#watermark-gradient)" 
                      opacity="0.6"
                      transform="translate(-10, 0)"
                    />
                    <defs>
                      <linearGradient id="watermark-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#a855f7" />
                        <stop offset="100%" stopColor="#7c3aed" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>
              
              {/* Corner watermark text */}
              <div className="absolute bottom-3 right-3 pointer-events-none">
                <span className="text-sm font-display font-bold text-white/60 tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  ECLIPSE
                </span>
              </div>
            </div>
            
            {/* Zoom Modal */}
            {images[selectedImage] && !/\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(images[selectedImage]) && (
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
                  const isVideo = img && /\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(img);
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
                  {/* Always show both prices */}
                  {/* Regular price */}
                  <p className="text-lg text-muted-foreground">
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
                </div>

                {product.description && (
                  <div 
                    className="prose prose-invert prose-sm max-w-none text-muted-foreground [&>p]:leading-relaxed [&>p]:mb-4 [&>p:last-child]:mb-0 [&>p:empty]:h-4 [&>h2]:text-foreground [&>h2]:text-lg [&>h2]:font-semibold [&>h2]:mt-6 [&>h2]:mb-3 [&>h3]:text-foreground [&>h3]:text-base [&>h3]:font-medium [&>h3]:mt-5 [&>h3]:mb-2 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-4 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-4 [&>hr]:border-border [&>hr]:my-6 [&_br]:block [&_br]:content-[''] [&_br]:mt-4"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.description) }}
                  />
                )}

                {/* Free Claim for Eclipse+ Members */}
                {canClaimThisProduct && (
                  <FreeProductClaim productId={product.id} productName={product.name} />
                )}

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

        {/* Related Products */}
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
