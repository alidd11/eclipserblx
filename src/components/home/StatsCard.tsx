import { memo, forwardRef } from 'react';
import { Package, Download, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';

const BASE_STATS = {
  downloads: 108,
  users: 480,
};

const formatNumber = (num: number) => {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(num >= 10000 ? 0 : 1)}K`;
  }
  return num.toString();
};

export const StatsCard = memo(forwardRef<HTMLDivElement>(function StatsCard(_, ref) {
  const isMobile = useIsMobile();

  const { data: stats } = useQuery({
    queryKey: ['homepage-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_homepage_stats');
      if (error) {
        console.error('[StatsCard] Failed to fetch stats:', error);
        return { products: 0, downloads: BASE_STATS.downloads, users: BASE_STATS.users };
      }
      const result = data as { products_count: number; downloads_count: number; users_count: number };
      return {
        products: result.products_count ?? 0,
        downloads: BASE_STATS.downloads + (result.downloads_count ?? 0),
        users: BASE_STATS.users + (result.users_count ?? 0),
      };
    },
    staleTime: 1000 * 60 * 5,
  });

  const statItems = [
    { value: stats?.products ?? 0, label: 'Products', icon: Package },
    { value: stats?.downloads ?? 0, label: 'Downloads', icon: Download },
    { value: stats?.users ?? 0, label: 'Members', icon: Users },
  ];

  if (isMobile) {
    return (
      <div ref={ref} className="rounded-md border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-2 px-1">
          {statItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex-1 text-center">
                <Icon className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-bold leading-none">{formatNumber(item.value)}+</p>
                <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-tighter">{item.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Desktop: clean, static, no animation — feels handcrafted
  return (
    <div ref={ref} className="rounded-md border border-border bg-card/80 backdrop-blur-sm">
      <div className="px-5 py-4 border-b border-border">
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">
          Platform
        </span>
      </div>
      <div className="divide-y divide-border">
        {statItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4 text-muted-foreground/70" />
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </div>
              <span className="text-sm font-semibold tabular-nums">{formatNumber(item.value)}+</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}));
