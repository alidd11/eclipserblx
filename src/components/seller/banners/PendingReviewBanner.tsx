import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

interface PendingReviewBannerProps {
  count: number;
}

export function PendingReviewBanner({ count }: PendingReviewBannerProps) {
  if (count <= 0) return null;

  return (
    <div className="border border-yellow-500/50 rounded-xl overflow-hidden">
      <div className="flex items-center gap-4 px-6 py-4 bg-yellow-500/5">
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
      </div>
    </div>
  );
}