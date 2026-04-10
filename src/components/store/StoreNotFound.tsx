import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Store } from 'lucide-react';

/**
 * Shared "Store Not Found" fallback used by all public store pages.
 */
export function StoreNotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4 safe-area-page">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-2">
        <Store className="h-8 w-8 text-muted-foreground/60" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">Store not found</h1>
      <p className="text-sm text-muted-foreground text-center max-w-xs">
        This store may have been removed, renamed, or is temporarily unavailable.
      </p>
      <Button asChild size="sm">
        <Link to="/products">Browse All Stores</Link>
      </Button>
    </div>
  );
}
