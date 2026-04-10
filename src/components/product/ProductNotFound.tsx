import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Package } from 'lucide-react';

/**
 * Shared "Product Not Found" fallback used by product detail pages.
 */
export function ProductNotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4 safe-area-page">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-2">
        <Package className="h-8 w-8 text-muted-foreground/60" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">Product not found</h1>
      <p className="text-sm text-muted-foreground text-center max-w-xs">
        This product may have been removed or is no longer available.
      </p>
      <Button asChild size="sm">
        <Link to="/products">Browse Products</Link>
      </Button>
    </div>
  );
}
