import { memo, useState, useEffect } from 'react';
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
  color: string;
  gradient: string;
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

export const StatsCard = memo(function StatsCard() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: stats } = useQuery({
    queryKey: ['homepage-stats'],
    queryFn: async () => {
      const [products, downloads, users] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
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
    { value: stats?.products ?? 0, label: 'Products', icon: Package, color: 'text-purple-400', gradient: 'from-purple-500/20 to-purple-600/20' },
    { value: stats?.downloads ?? 0, label: 'Downloads', icon: Download, color: 'text-emerald-400', gradient: 'from-emerald-500/20 to-emerald-600/20' },
    { value: stats?.users ?? 0, label: 'Happy Users', icon: Users, color: 'text-amber-400', gradient: 'from-amber-500/20 to-amber-600/20' },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % statItems.length);
    }, 4000); // 4 seconds per stat

    return () => clearInterval(interval);
  }, [statItems.length]);

  const currentStat = statItems[currentIndex];

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
      <div className={`absolute inset-0 bg-gradient-to-br ${currentStat.gradient} opacity-50 transition-opacity duration-500`} />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 ${currentStat.color}`}>
            <TrendingUp className="h-5 w-5" />
          </div>
          <span className="text-xs text-muted-foreground">Live Stats</span>
        </div>

        <div className="h-20 relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="absolute inset-0 will-change-transform"
            >
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 ${currentStat.color} mb-2`}>
                <currentStat.icon className="h-5 w-5" />
              </div>
              <div className="font-display text-2xl font-bold gradient-text">
                <AnimatedValue value={currentStat.value} />
              </div>
              <p className="text-sm text-muted-foreground">{currentStat.label}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dot Indicators */}
        <div className="flex items-center gap-1 mt-2">
          {statItems.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                i === currentIndex
                  ? 'bg-primary w-3'
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
              aria-label={`View stat ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
});
