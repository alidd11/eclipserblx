import { useLoyalty } from '@/hooks/useLoyalty';
import { useAuth } from '@/hooks/useAuth';
import { Trophy, Star, Crown, Gem } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';

const TIER_CONFIG = {
  bronze: { icon: Star, label: 'Bronze', color: 'text-amber-600' },
  silver: { icon: Trophy, label: 'Silver', color: 'text-slate-400' },
  gold: { icon: Crown, label: 'Gold', color: 'text-yellow-400' },
  diamond: { icon: Gem, label: 'Diamond', color: 'text-cyan-400' },
};

export function LoyaltyBadge() {
  const { user } = useAuth();
  const { points, tier, nextTier, progress, isLoading } = useLoyalty();

  if (!user || isLoading) return null;

  const config = TIER_CONFIG[tier];
  const Icon = config.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/50 border border-border cursor-default">
          <Icon className={`h-3.5 w-3.5 ${config.color}`} />
          <span className="text-xs font-semibold">{points.toLocaleString()} pts</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="w-52 p-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold flex items-center gap-1">
              <Icon className={`h-4 w-4 ${config.color}`} />
              {config.label} Tier
            </span>
            <span className="text-xs text-muted-foreground">{points.toLocaleString()} pts</span>
          </div>
          {nextTier && (
            <>
              <Progress value={progress} className="h-1.5" />
              <p className="text-xs text-muted-foreground">
                {nextTier.pointsNeeded.toLocaleString()} pts to {nextTier.name}
              </p>
            </>
          )}
          <p className="text-[10px] text-muted-foreground">Earn 1pt per £1 spent</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
