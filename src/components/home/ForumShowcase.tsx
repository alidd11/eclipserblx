import { memo, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, ArrowRight, Users, TrendingUp, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import { motion } from 'framer-motion';

export const ForumShowcase = memo(function ForumShowcase() {
  const autoplayPlugin = useRef(
    Autoplay({ delay: 3000, stopOnInteraction: false })
  );

  const { data: categories, isLoading } = useQuery({
    queryKey: ['forum-categories-home'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forum_categories')
        .select('*')
        .order('display_order', { ascending: true })
        .limit(4);

      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const iconMap = useMemo<Record<string, React.ElementType>>(() => ({
    MessageSquare,
    Users,
    TrendingUp,
  }), []);

  const colorMap: Record<number, { gradient: string; color: string; bgColor: string; glowColor: string }> = {
    0: { gradient: 'from-purple-500/20 to-purple-600/20', color: 'text-purple-400', bgColor: 'bg-purple-500/20', glowColor: 'shadow-purple-500/30' },
    1: { gradient: 'from-blue-500/20 to-blue-600/20', color: 'text-blue-400', bgColor: 'bg-blue-500/20', glowColor: 'shadow-blue-500/30' },
    2: { gradient: 'from-emerald-500/20 to-emerald-600/20', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', glowColor: 'shadow-emerald-500/30' },
    3: { gradient: 'from-amber-500/20 to-amber-600/20', color: 'text-amber-400', bgColor: 'bg-amber-500/20', glowColor: 'shadow-amber-500/30' },
  };

  if (isLoading) {
    return (
      <section className="pb-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </section>
    );
  }

  return (
    <section className="pb-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {/* Main Card Container - matching hero/stats style */}
          <div className="group relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-card via-card to-emerald-500/5 p-6 md:p-8 transition-all duration-500 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10">
            {/* Animated background glow */}
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl opacity-50" />
            <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-primary/15 rounded-full blur-3xl opacity-50" />
            
            {/* Scanline effect */}
            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)' }} />

            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-white/10">
                      <Users className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-display font-bold">Join the Community</h2>
                    <p className="text-sm text-muted-foreground">Connect, share, and get help</p>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-400">Active Now</span>
                </div>
              </div>

              {/* Categories Carousel */}
              <Carousel
                opts={{
                  align: 'start',
                  loop: true,
                }}
                plugins={[autoplayPlugin.current]}
                className="w-full"
              >
                <CarouselContent className="-ml-3">
                  {categories?.map((category, index) => {
                    const IconComponent = iconMap[category.icon || ''] || MessageSquare;
                    const colors = colorMap[index % 4];

                    return (
                      <CarouselItem key={category.id} className="pl-3 basis-full sm:basis-1/2 lg:basis-1/3">
                        <Link
                          to={`/forum?category=${category.slug}`}
                          className="group/card relative overflow-hidden rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-5 transition-all duration-300 hover:border-primary/50 hover:bg-card block h-full"
                        >
                          <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0 group-hover/card:opacity-100 transition-opacity duration-300`} />
                          
                          <div className="relative z-10">
                            <div className={`mb-3 inline-flex items-center justify-center w-10 h-10 rounded-lg ${colors.bgColor} ${colors.color} shadow-lg ${colors.glowColor} border border-white/10`}>
                              <IconComponent className="h-5 w-5" />
                            </div>
                            
                            <h3 className="font-display font-semibold text-base mb-1.5 group-hover/card:text-primary transition-colors">
                              {category.name}
                            </h3>
                            
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                              {category.description || 'Join the discussion'}
                            </p>
                            
                            <div className="flex items-center text-xs text-primary font-medium opacity-0 group-hover/card:opacity-100 transition-opacity">
                              <span>Browse</span>
                              <ArrowRight className="ml-1 h-3.5 w-3.5 group-hover/card:translate-x-1 transition-transform" />
                            </div>
                          </div>
                        </Link>
                      </CarouselItem>
                    );
                  })}
                </CarouselContent>
              </Carousel>

              {/* Footer link */}
              <div className="flex items-center justify-between mt-5 pt-4 border-t border-border/50">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>4 Categories</span>
                </div>
                <Link
                  to="/forum"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium transition-colors group/link"
                >
                  View All Forums
                  <ArrowRight className="h-4 w-4 group-hover/link:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
});
