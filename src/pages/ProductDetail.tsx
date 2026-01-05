import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShoppingCart, Check, ChevronLeft, Download, Shield, Zap, Clock } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/hooks/useCart';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { addItem, isInCart } = useCart();
  const [selectedImage, setSelectedImage] = useState(0);

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
  const images = product.images?.length ? product.images : [null];

  const handleAddToCart = () => {
    if (!inCart) {
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.images?.[0],
        slug: product.slug,
      });
    }
  };

  return (
    <MainLayout>
      <div className="container py-8 space-y-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <span>/</span>
          <Link to="/products" className="hover:text-foreground transition-colors">Products</Link>
          {product.categories && (
            <>
              <span>/</span>
              <Link 
                to={`/products?category=${product.categories.slug}`}
                className="hover:text-foreground transition-colors"
              >
                {product.categories.name}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        <Link to="/products" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
          Back to Products
        </Link>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Images */}
          <div className="space-y-4">
            <div className="aspect-video gaming-card overflow-hidden">
              {images[selectedImage] ? (
                <img
                  src={images[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-background">
                  <span className="text-6xl font-display font-bold text-muted-foreground/30">
                    {product.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={cn(
                      "flex-shrink-0 w-20 aspect-video rounded-lg overflow-hidden border-2 transition-colors",
                      selectedImage === i ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
                    )}
                  >
                    {img ? (
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-muted" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-6">
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

            <div className="text-4xl font-bold">£{product.price.toFixed(2)}</div>

            {product.description && (
              <div className="prose prose-invert max-w-none">
                <p className="text-muted-foreground leading-relaxed">{product.description}</p>
              </div>
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

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-border">
              <div className="text-center space-y-2">
                <Download className="h-6 w-6 mx-auto text-primary" />
                <p className="text-xs text-muted-foreground">Instant Download</p>
              </div>
              <div className="text-center space-y-2">
                <Shield className="h-6 w-6 mx-auto text-primary" />
                <p className="text-xs text-muted-foreground">Secure Payment</p>
              </div>
              <div className="text-center space-y-2">
                <Zap className="h-6 w-6 mx-auto text-primary" />
                <p className="text-xs text-muted-foreground">24/7 Support</p>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts && relatedProducts.length > 0 && (
          <section className="pt-12 space-y-6">
            <h2 className="text-2xl font-display font-bold">Related Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((p) => (
                <div key={p.id} className="gaming-card-hover overflow-hidden">
                  <Link to={`/products/${p.slug}`}>
                    <div className="aspect-video bg-muted overflow-hidden">
                      {p.images?.[0] ? (
                        <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-3xl font-bold text-muted-foreground/30">{p.name.charAt(0)}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold truncate">{p.name}</h3>
                      <p className="text-primary font-bold">£{p.price.toFixed(2)}</p>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </MainLayout>
  );
}
