import { BadgeCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface VerifiedPurchaseBadgeProps {
  className?: string;
}

export function VerifiedPurchaseBadge({ className }: VerifiedPurchaseBadgeProps) {
  return (
    <Badge 
      variant="outline" 
      className={`text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 ${className || ''}`}
    >
      <BadgeCheck className="h-3 w-3 mr-1" />
      Verified Purchase
    </Badge>
  );
}
