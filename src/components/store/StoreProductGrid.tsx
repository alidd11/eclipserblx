import { useState } from 'react';
import { ProductCard } from '@/components/ui/ProductCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Package } from 'lucide-react';
import { FollowButton } from '@/components/store/FollowButton';
import { Link } from 'react-router-dom';

interface StoreProductGridProps {
  products: any[] | undefined;
  isLoading: boolean;
  storeId: string;
  accentColor: string;
  eclipsePlusEnabled?: boolean;
  title?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  onBackToStore?: () => void;
}

const INITIAL_COUNT = 12;
const LOAD_MORE_COUNT = 12;

export function StoreProductGrid({
  products,
  isLoading,
  storeId,
  accentColor,
  eclipsePlusEnabled,
  title = 'All Products',
  emptyTitle = 'No Products Yet',
  emptyDescription = "This store hasn't listed any products yet.",
  onBackToStore,
}: StoreProductGridProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
        ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="py-12 text-center">
        <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-medium mb-2">{emptyTitle}</h3>
        <p className="text-muted-foreground mb-4">{emptyDescription}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          <FollowButton storeId={storeId} accentColor={accentColor} size="sm" />
          {onBackToStore ? (
            <Button variant="outline" size="sm" onClick={onBackToStore}>
              View All Products
            </Button>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link to="/stores">Browse Similar Stores</Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  const visibleProducts = products.slice(0, visibleCount);
  const hasMore = visibleCount < products.length;

  return (
    <div id="store-products" className="scroll-mt-20">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
        {title} ({products.length})
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {visibleProducts.map((product: any) => {
          const isNewProduct = product.created_at
            ? Date.now() - new Date(product.created_at).getTime() < 7 * 24 * 60 * 60 * 1000
            : false;

          return (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              price={product.price}
              image={product.images?.[0] || '/placeholder.svg'}
              slug={String(product.product_number)}
              category={(product.categories as any)?.name}
              isResellable={product.is_resellable}
              showNewBadge={isNewProduct}
              createdAt={product.created_at}
              storeEclipseEnabled={eclipsePlusEnabled}
            />
          );
        })}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-6">
          <Button
            variant="outline"
            onClick={() => setVisibleCount(prev => prev + LOAD_MORE_COUNT)}
            className="min-w-[200px]"
          >
            Show More ({products.length - visibleCount} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}
