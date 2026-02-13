import { Crown, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TierBadgeProps {
  isPremium: boolean;
  className?: string;
}

export function TierBadge({ isPremium, className }: TierBadgeProps) {
  if (isPremium) {
    return (
      <Badge 
        className={cn(
          "bg-primary text-primary-foreground border-0",
          className
        )}
      >
        <Crown className="h-3 w-3 mr-1" />
        Eclipse+
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className={cn("text-muted-foreground", className)}>
      <Shield className="h-3 w-3 mr-1" />
      Free
    </Badge>
  );
}
