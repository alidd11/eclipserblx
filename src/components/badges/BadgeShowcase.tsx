import { Badge as BadgeType, UserBadge } from '@/hooks/useBadges';
import { BadgeCard } from './BadgeCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingBag, Users, Heart } from 'lucide-react';

interface BadgeShowcaseProps {
  badges: BadgeType[];
  userBadges: UserBadge[];
  showAll?: boolean;
}

export function BadgeShowcase({ badges, userBadges, showAll = false }: BadgeShowcaseProps) {
  const earnedBadgeIds = new Set(userBadges.map(ub => ub.badge_id));
  
  const getBadgeEarnedAt = (badgeId: string) => {
    const userBadge = userBadges.find(ub => ub.badge_id === badgeId);
    return userBadge?.earned_at;
  };

  const categorizedBadges = {
    purchase: badges.filter(b => b.category === 'purchase'),
    community: badges.filter(b => b.category === 'community'),
    engagement: badges.filter(b => b.category === 'engagement'),
  };

  const earnedCount = userBadges.length;
  const totalCount = badges.length;

  // If not showing all, just show earned badges in a row
  if (!showAll) {
    const earnedBadges = badges.filter(b => earnedBadgeIds.has(b.id));
    
    if (earnedBadges.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">No badges earned yet</p>
      );
    }

    return (
      <div className="flex flex-wrap gap-2">
        {earnedBadges.slice(0, 8).map(badge => (
          <BadgeCard
            key={badge.id}
            badge={badge}
            earned
            earnedAt={getBadgeEarnedAt(badge.id)}
            size="sm"
          />
        ))}
        {earnedBadges.length > 8 && (
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground font-medium">
            +{earnedBadges.length - 8}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Badges</h3>
        <span className="text-sm text-muted-foreground">
          {earnedCount} / {totalCount} earned
        </span>
      </div>

      <Tabs defaultValue="purchase" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="purchase" className="flex items-center gap-1.5 text-xs">
            <ShoppingBag className="h-3.5 w-3.5" />
            Purchase
          </TabsTrigger>
          <TabsTrigger value="community" className="flex items-center gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5" />
            Community
          </TabsTrigger>
          <TabsTrigger value="engagement" className="flex items-center gap-1.5 text-xs">
            <Heart className="h-3.5 w-3.5" />
            Engagement
          </TabsTrigger>
        </TabsList>

        {Object.entries(categorizedBadges).map(([category, categoryBadges]) => (
          <TabsContent key={category} value={category} className="mt-4">
            <div className="grid gap-3">
              {categoryBadges.map(badge => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  earned={earnedBadgeIds.has(badge.id)}
                  earnedAt={getBadgeEarnedAt(badge.id)}
                  showDetails
                  size="md"
                />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
