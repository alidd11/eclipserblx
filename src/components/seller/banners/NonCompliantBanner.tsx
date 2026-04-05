import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Package } from 'lucide-react';

interface NonCompliantBannerProps {
  count: number;
}

export function NonCompliantBanner({ count }: NonCompliantBannerProps) {
  if (count <= 0) return null;

  return (
    <div className="border border-destructive/50 rounded-xl overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 px-6 py-4 bg-destructive/5">
        <div className="flex items-center gap-3 flex-1">
          <div className="p-2 rounded-lg bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="font-semibold text-destructive">
              {count} Product{count > 1 ? 's' : ''} Need Attention
            </p>
            <p className="text-sm text-muted-foreground">
              Some products are missing a file or have a description under 100 characters. Please update them.
            </p>
          </div>
        </div>
        <Button variant="destructive" size="sm" asChild>
          <Link to="/seller/products">
            <Package className="h-4 w-4 mr-2" />
            Fix Products
          </Link>
        </Button>
      </div>
    </div>
  );
}