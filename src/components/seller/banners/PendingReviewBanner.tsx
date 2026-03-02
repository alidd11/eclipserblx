import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

interface PendingReviewBannerProps {
  count: number;
}

export function PendingReviewBanner({ count }: PendingReviewBannerProps) {
  if (count <= 0) return null;

  return (
    <Card className="border-yellow-500/50 bg-yellow-500/5">
      <CardContent className="flex items-center gap-4 py-4">
        <Clock className="h-8 w-8 text-yellow-500" />
        <div className="flex-1">
          <p className="font-medium">Products Pending Review</p>
          <p className="text-sm text-muted-foreground">
            You have {count} product(s) awaiting moderation approval.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/seller/products">View Products</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
