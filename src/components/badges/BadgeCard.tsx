import { Badge as BadgeType } from '@/hooks/useBadges';
import { BadgeIcon } from './BadgeIcon';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface BadgeCardProps {
  badge: BadgeType;
  earned?: boolean;
  earnedAt?: string;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function BadgeCard({ badge, earned = false, earnedAt, showDetails = false, size = 'md' }: BadgeCardProps) {
  if (showDetails) {
    return (
      <Card className={cn(
        'transition-all',
        earned ? 'border-primary/30 bg-card' : 'border-muted bg-muted/30'
      )}>
        <CardContent className="p-4 flex items-start gap-3">
          <BadgeIcon icon={badge.icon} color={badge.color} size={size} earned={earned} />
          <div className="flex-1 min-w-0">
            <h4 className={cn('font-medium text-sm', !earned && 'text-muted-foreground')}>
              {badge.name}
            </h4>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {badge.description}
            </p>
            {earned && earnedAt && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Earned {format(new Date(earnedAt), 'MMM d, yyyy')}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="cursor-default">
            <BadgeIcon icon={badge.icon} color={badge.color} size={size} earned={earned} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <p className="font-medium text-sm">{badge.name}</p>
          <p className="text-xs text-muted-foreground">{badge.description}</p>
          {earned && earnedAt && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Earned {format(new Date(earnedAt), 'MMM d, yyyy')}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
