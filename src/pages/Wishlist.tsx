import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useWishlistItems, useWishlist } from '@/hooks/useWishlist';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Heart, Trash2, Store, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } formatRelative } from '@/lib/dateUtils';
import { useCurrency } from '@/hooks/useCurrency';
import { usePageMeta } from '@/hooks/usePageMeta';

const WISHLIST_ITEMS_PER_PAGE = 10;

export default function Wishlist() {
  usePageMeta({ title: 'My Wishlist', description: 'Your saved products on Eclipse. Keep track of items you love and buy them when ready.', canonicalPath: '/wishlist' });
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: wishlistItems, isLoading } = useWishlistItems();
  const { removeFromWishlist } = useWishlist();
  const { formatPrice } = useCurrency();
  const [currentPage, setCurrentPage] = useState(1);

  const totalCount = wishlistItems?.length || 0;
  const totalPages = Math.ceil(totalCount / WISHLIST_ITEMS_PER_PAGE);
  const paginatedItems = wishlistItems?.slice(
    (currentPage - 1) * WISHLIST_ITEMS_PER_PAGE,
    currentPage * WISHLIST_ITEMS_PER_PAGE
  ) || [];

  if (!user) {
    return (
      <MainLayout>
        <div className="container max-w-4xl py-16 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-muted mb-4">
            <Heart className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Sign in to view your wishlist</h2>
          <p className="text-muted-foreground mb-6">
            Save products you love and access them anytime.
          </p>
          <Button onClick={() => navigate('/auth')}>
            Sign In
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-4xl py-8">
        <div className="flex items-center gap-2.5 mb-6">
          <Heart className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">My Wishlist</h1>
            <p className="text-sm text-muted-foreground">
              {totalCount} saved product{totalCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : !wishlistItems || wishlistItems.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="Your wishlist is empty"
            description="Browse products and click the heart icon to save them here."
            actionLabel="Browse Products"
            actionTo="/products"
          />
        ) : (
          <div>
            <div className="divide-y divide-border">
              {paginatedItems.map((item) => {
                const product = item.products;
                if (!product) return null;

                const imageUrl = product.images?.[0] || '/placeholder.svg';
                const store = product.stores;

                return (
                  <div key={item.id} className="py-4 first:pt-0">
                    <div className="flex gap-3">
                      {/* Product Image */}
                      <Link 
                        to={`/products/${(product as any).product_number || product.slug}`}
                        className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-muted"
                      >
                        <img
                          src={imageUrl}
                          alt={product.name}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                      </Link>

                      {/* Product Info */}
                      <div className="flex-1 py-0.5 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <Link 
                              to={`/products/${(product as any).product_number || product.slug}`}
                              className="font-semibold hover:text-primary transition-colors line-clamp-1 text-sm"
                            >
                              {product.name}
                            </Link>
                            
                            {store && (
                              <Link 
                                to={`/store/${store.slug}`}
                                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-0.5"
                              >
                                <Store className="h-3 w-3" />
                                {store.name}
                              </Link>
                            )}

                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              {product.description?.replace(/<[^>]*>/g, '').slice(0, 100)}
                            </p>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <p className="text-base font-bold">
                              {formatPrice(Number(product.price))}
                            </p>
                            {!product.is_active && (
                              <Badge variant="secondary" className="mt-1 text-[10px]">
                                Unavailable
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[11px] text-muted-foreground">
                            Saved {formatRelative(item.created_at)}
                          </span>
                          
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFromWishlist(product.id)}
                              className="text-muted-foreground hover:text-destructive h-7 px-2"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                            
                            {product.is_active && (
                              <Button asChild size="sm" className="h-7 text-xs px-3">
                                <Link to={`/products/${(product as any).product_number || product.slug}`}>
                                  View
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-border mt-2">
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
