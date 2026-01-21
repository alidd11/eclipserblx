import { memo, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, ArrowRight, Users, TrendingUp, MessagesSquare } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { SectionWrapper } from './SectionWrapper';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import { motion } from 'framer-motion';

export const ForumShowcase = memo(function ForumShowcase() {
  const autoplayPlugin = useRef(Autoplay({
    delay: 3000,
    stopOnInteraction: true
  }));

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
    staleTime: 1000 * 60 * 5
  });

  const iconMap = useMemo<Record<string, React.ElementType>>(() => ({
    MessageSquare,
    Users,
    TrendingUp
  }), []);

  if (isLoading) {
    return (
      <SectionWrapper>
        <Skeleton className="h-64 rounded-2xl" />
      </SectionWrapper>
    );
  }

  return (
    <SectionWrapper>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        {/* Clean card container */}
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <MessagesSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold">Community Forums</h2>
                <p className="text-sm text-muted-foreground">Connect, share, and get help</p>
              </div>
            </div>
            <Link 
              to="/forum" 
              className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            >
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Categories Carousel */}
          <Carousel
            opts={{ align: 'start', loop: true }}
            plugins={[autoplayPlugin.current]}
            className="w-full"
          >
            <CarouselContent className="-ml-3">
              {categories?.map((category) => {
                const IconComponent = iconMap[category.icon || ''] || MessageSquare;
                
                return (
                  <CarouselItem key={category.id} className="pl-3 basis-full sm:basis-1/2 lg:basis-1/4">
                    <Link
                      to={`/forum?category=${category.slug}`}
                      className="block rounded-xl border border-border bg-muted/30 p-4 h-full hover:border-primary/50 hover:bg-muted/50 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                        <IconComponent className="h-5 w-5 text-primary" />
                      </div>

                      <h3 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">
                        {category.name}
                      </h3>

                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {category.description || 'Join the discussion'}
                      </p>
                    </Link>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
          </Carousel>
        </div>
      </motion.div>
    </SectionWrapper>
  );
});
