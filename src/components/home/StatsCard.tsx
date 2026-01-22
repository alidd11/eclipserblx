import { memo, useState, useEffect, forwardRef } from 'react';
import { Package, Download, Users, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCountUp } from '@/hooks/useCountUp';
import { motion, AnimatePresence } from 'framer-motion';

const BASE_STATS = {
  downloads: 108,
  users: 480,
};

interface StatItem {
  value: number;
  label: string;
  icon: React.ElementType;
}

const AnimatedValue = memo(function AnimatedValue({ value, suffix = '+' }: { value: number; suffix?: string }) {
  const { count, elementRef } = useCountUp({ end: value, duration: 2000 });
  
  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(num >= 10000 ? 0 : 1)}K`;
    }
    return num.toString();
  };

  return (
    <span ref={elementRef}>
      {formatNumber(count)}{suffix}
    </span>
  );
});

export const StatsCard = memo(forwardRef<HTMLDivElement>(function StatsCard(_, ref) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: stats } = useQuery({
    queryKey: ['homepage-stats'],
    queryFn: async () => {
      const now = new Date().toISOString();
      const [products, downloads, users] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true).or(`release_at.is.null,release_at.lte.${now}`),
        supabase.from('download_logs').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
      ]);

      return {
        products: products.count ?? 0,
        downloads: BASE_STATS.downloads + (downloads.count ?? 0),
        users: BASE_STATS.users + (users.count ?? 0),
      };
    },
    staleTime: 1000 * 60 * 5,
  });

  const statItems: StatItem[] = [
    { value: stats?.products ?? 0, label: 'Products', icon: Package },
    { value: stats?.downloads ?? 0, label: 'Downloads', icon: Download },
    { value: stats?.users ?? 0, label: 'Customers', icon: Users },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % statItems.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [statItems.length]);

  const currentStat = statItems[currentIndex];
  const CurrentIcon = currentStat.icon;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <TrendingUp className="h-4 w-4 text-primary" />
        </div>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Our Community</span>
      </div>

      {/* Main stat display */}
      <div className="h-24 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                <CurrentIcon className="h-6 w-6 text-foreground" />
              </div>
              <div className="flex-1">
                <div className="font-display text-4xl font-bold text-foreground">
                  <AnimatedValue value={currentStat.value} />
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{currentStat.label}</p>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="mt-4 h-1 bg-muted rounded-full overflow-hidden">
              <motion.div 
                className="h-full rounded-full bg-primary"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 4, ease: 'linear' }}
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation dots */}
      <div className="flex items-center gap-2 mt-3">
        {statItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                i === currentIndex
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
              aria-label={`View ${item.label}`}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          );
        })}
      </div>
    </div>
  );
}));
