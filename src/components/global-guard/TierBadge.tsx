import { Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TierBadgeProps {
  isPremium: boolean;
  className?: string;
}

export function TierBadge({ isPremium, className }: TierBadgeProps) {
  return (
    <Badge variant="secondary" className={cn("text-muted-foreground", className)}>
      <Shield className="h-3 w-3 mr-1" />
      {isPremium ? 'Premium' : 'Free'}
    </Badge>
  );
}
