import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useWishlistItems, useWishlist } from '@/hooks/useWishlist';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Heart, ShoppingBag, Trash2, Store, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Wishlist() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: wishlistItems, isLoading } = useWishlistItems();
  const { removeFromWishlist } = useWishlist();

  if (!user) {
    return (
      <MainLayout>
        <div className="container max-w-4xl py-12">
          <Card>
            <CardContent className="py-16 text-center">
              <Heart className="h-16 w-16 mx-auto mb-6 text-muted-foreground opacity-40" />
              <h2 className="text-2xl font-bold mb-3">Sign in to view your wishlist</h2>
              <p className="text-muted-foreground mb-6">
                Save products you love and access them anytime.
              </p>
              <Button onClick={() => navigate('/auth')}>
                Sign In
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-4xl py-8">
        <div className="flex items-center gap-3 mb-8">
          <Heart className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">My Wishlist</h1>
            <p className="text-muted-foreground">
              {wishlistItems?.length || 0} saved products
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : !wishlistItems || wishlistItems.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Heart className="h-16 w-16 mx-auto mb-6 text-muted-foreground opacity-40" />
              <h2 className="text-xl font-semibold mb-2">Your wishlist is empty</h2>
              <p className="text-muted-foreground mb-6">
                Browse products and click the heart icon to save them here.
              </p>
              <Button asChild>
                <Link to="/products">
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Browse Products
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {wishlistItems.map((item) => {
              const product = item.products;
              if (!product) return null;

              const imageUrl = product.images?.[0] || '/placeholder.svg';
              const store = product.stores;

              return (
                <Card 
                  key={item.id} 
                  className="overflow-hidden hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-0">
                    <div className="flex gap-4">
                      {/* Product Image */}
                      <Link 
                        to={`/product/${product.slug}`}
                        className="flex-shrink-0 w-32 h-32 bg-muted"
                      >
                        <img
                          src={imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </Link>

                      {/* Product Info */}
                      <div className="flex-1 py-4 pr-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <Link 
                              to={`/product/${product.slug}`}
                              className="font-semibold text-lg hover:text-primary transition-colors line-clamp-1"
                            >
                              {product.name}
                            </Link>
                            
                            {store && (
                              <Link 
                                to={`/store/${store.slug}`}
                                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mt-1"
                              >
                                <Store className="h-3.5 w-3.5" />
                                {store.name}
                              </Link>
                            )}

                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {product.description?.replace(/<[^>]*>/g, '').slice(0, 120)}
                              {(product.description?.length || 0) > 120 && '...'}
                            </p>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <p className="text-xl font-bold">
                              £{product.price.toFixed(2)}
                            </p>
                            {!product.is_active && (
                              <Badge variant="secondary" className="mt-1">
                                Unavailable
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs text-muted-foreground">
                            Saved {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                          </span>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFromWishlist(product.id)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            
                            {product.is_active && (
                              <Button asChild size="sm">
                                <Link to={`/product/${product.slug}`}>
                                  View Product
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
