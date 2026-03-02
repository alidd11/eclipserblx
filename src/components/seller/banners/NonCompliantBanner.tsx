import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Package } from 'lucide-react';

interface NonCompliantBannerProps {
  count: number;
}

export function NonCompliantBanner({ count }: NonCompliantBannerProps) {
  if (count <= 0) return null;

  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-4">
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
      </CardContent>
    </Card>
  );
}
