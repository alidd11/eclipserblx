import { Shield, Users, Server, Clock } from 'lucide-react';
import type { GlobalGuardStats } from '@/types/global-guard';

interface BanStatsCardsProps {
  stats: GlobalGuardStats;
  isLoading?: boolean;
}

export function BanStatsCards({ stats, isLoading }: BanStatsCardsProps) {
  const cards = [
    { title: 'Total Bans', value: stats.totalBans, icon: Users },
    { title: 'Active Bans', value: stats.activeBans, icon: Shield },
    { title: 'Servers Protected', value: stats.serversProtected, icon: Server },
    { title: 'Bans This Week', value: stats.recentBans, icon: Clock },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.title} className="border border-border rounded-xl overflow-hidden">
            <div className="p-4 md:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs md:text-sm text-muted-foreground truncate">{card.title}</p>
                  <p className="text-xl md:text-3xl font-bold text-foreground mt-1">
                    {isLoading ? '...' : card.value.toLocaleString()}
                  </p>
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}