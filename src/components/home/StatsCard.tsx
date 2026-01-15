import { memo, useState, useEffect, forwardRef } from 'react';
import { Package, Download, Users, TrendingUp, Zap } from 'lucide-react';
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
  bgColor: string;
  glowColor: string;
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
    { 
      value: stats?.products ?? 0, 
      label: 'Premium Products', 
      icon: Package, 
      color: 'text-violet-400',
      bgColor: 'bg-violet-500/20',
      glowColor: 'shadow-violet-500/30'
    },
    { 
      value: stats?.downloads ?? 0, 
      label: 'Total Downloads', 
      icon: Download, 
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20',
      glowColor: 'shadow-emerald-500/30'
    },
    { 
      value: stats?.users ?? 0, 
      label: 'Happy Customers', 
      icon: Users, 
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/20',
      glowColor: 'shadow-amber-500/30'
    },
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
    <div className="group relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 p-5 transition-all duration-500 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10">
      {/* Animated background glow */}
      <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-30 transition-all duration-700 ${currentStat.bgColor}`} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Scanline effect */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)' }} />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className={`w-8 h-8 rounded-lg ${currentStat.bgColor} flex items-center justify-center shadow-lg ${currentStat.glowColor}`}>
                <Zap className={`h-4 w-4 ${currentStat.color}`} />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            </div>
            <span className="text-xs font-medium text-primary/80 uppercase tracking-wider">Live Stats</span>
          </div>
        </div>

        {/* Main stat display */}
        <div className="h-24 relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="absolute inset-0 will-change-transform"
            >
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-xl ${currentStat.bgColor} flex items-center justify-center shadow-lg ${currentStat.glowColor} border border-white/10`}>
                  <CurrentIcon className={`h-6 w-6 ${currentStat.color}`} />
                </div>
                <div className="flex-1">
                  <div className="font-display text-4xl font-bold bg-gradient-to-r from-white via-white to-primary bg-clip-text text-transparent">
                    <AnimatedValue value={currentStat.value} />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium mt-0.5">{currentStat.label}</p>
                </div>
              </div>
              
              {/* Mini progress bar */}
              <div className="mt-4 h-1 bg-muted/30 rounded-full overflow-hidden">
                <motion.div 
                  className={`h-full rounded-full ${currentStat.bgColor.replace('/20', '')}`}
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 4, ease: 'linear' }}
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation dots */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1.5">
            {statItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300 ${
                    i === currentIndex
                      ? `${item.bgColor} ${item.color} border border-white/20`
                      : 'bg-muted/20 text-muted-foreground/50 hover:bg-muted/40'
                  }`}
                  aria-label={`View ${item.label}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3 text-emerald-400" />
            <span>Growing</span>
          </div>
        </div>
      </div>
    </div>
  );
}));
