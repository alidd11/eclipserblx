import { BadgeCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface VerifiedPurchaseBadgeProps {
  className?: string;
}

export function VerifiedPurchaseBadge({ className }: VerifiedPurchaseBadgeProps) {
  return (
    <Badge 
      variant="outline" 
      className={`text-xs bg-success/10 text-success dark:text-success border-success/30 ${className || ''}`}
    >
      <BadgeCheck className="h-3 w-3 mr-1" />
      Verified Purchase
    </Badge>
  );
}
